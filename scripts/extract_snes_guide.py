#!/usr/bin/env python3
"""Extract the SNES PAL catalog, reference prices, rarity, and cover images."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import unicodedata
from pathlib import Path

import fitz


PRICE_PATTERN = re.compile(r"([\d.]+,\d{1,2})€")
YEAR_PATTERN = re.compile(r"Jahr:\s*(\d{4})")


def run(command: list[str]) -> str:
    result = subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\f", " ")).strip()


def euro_to_cents(value: str) -> int:
    normalized = value.replace(".", "").replace(",", ".")
    return round(float(normalized) * 100)


def extract_text_entries(pdf_path: Path) -> list[dict]:
    text = run(["pdftotext", "-layout", str(pdf_path), "-"])
    lines = text.replace("\f", "\n").splitlines()
    entries: list[dict] = []

    for index, line in enumerate(lines):
        if "Entwickler:" not in line:
            continue

        title_index = index - 1
        while title_index >= 0 and not clean(lines[title_index]):
            title_index -= 1
        if title_index < 0:
            raise ValueError(f"Kein Titel vor Zeile {index + 1} gefunden")

        title = clean(lines[title_index])
        developer = clean(line.split("Entwickler:", 1)[1])

        publisher = None
        year = None
        header_index = None
        for lookahead in range(index + 1, min(index + 12, len(lines))):
            candidate = clean(lines[lookahead])
            if "Herausgeber:" in candidate:
                publisher = clean(candidate.split("Herausgeber:", 1)[1])
            if "Jahr:" in candidate:
                year_match = YEAR_PATTERN.search(candidate)
                year = int(year_match.group(1)) if year_match else None
            if all(label in candidate for label in ("Modul", "OVP", "Neu", "Box", "Anleitung")):
                header_index = lookahead
                break

        if publisher is None or year is None or header_index is None:
            raise ValueError(f"Unvollständige Metadaten für {title!r}")

        price_line = None
        for lookahead in range(header_index + 1, min(header_index + 5, len(lines))):
            candidate = clean(lines[lookahead])
            if len(PRICE_PATTERN.findall(candidate)) == 5:
                price_line = candidate
                break
        if price_line is None:
            raise ValueError(f"Keine fünf Preise für {title!r} gefunden")

        values = [euro_to_cents(value) for value in PRICE_PATTERN.findall(price_line)]
        entries.append(
            {
                "title": title,
                "developer": developer,
                "publisher": publisher,
                "year": year,
                "prices": {
                    "module": values[0],
                    "cib": values[1],
                    "new": values[2],
                    "box": values[3],
                    "manual": values[4],
                },
            }
        )

    return entries


def extract_visual_entries(pdf_path: Path) -> tuple[list[dict], list[int]]:
    document = fitz.open(pdf_path)
    covers: list[dict] = []
    ratings: list[int] = []

    for page_number, page in enumerate(document, start=1):
        if page_number < 3:
            continue

        images = page.get_image_info(xrefs=True)
        for image in images:
            width = image["width"]
            height = image["height"]
            if width >= 150 and height >= 100:
                covers.append(
                    {
                        "page": page_number,
                        "xref": image["xref"],
                    }
                )

        developer_labels = sorted(
            page.search_for("Entwickler:"),
            key=lambda rectangle: (rectangle.y0, rectangle.x0),
        )
        stars = [
            image
            for image in images
            if image["width"] == 50 and image["height"] == 50
        ]
        for label in developer_labels:
            rating = sum(
                abs(star["bbox"][1] - (label.y0 + 30.9)) < 3
                for star in stars
            )
            if rating not in (1, 2, 3):
                raise ValueError(
                    f"Ungültige Bewertung auf PDF-Seite {page_number}: {rating}"
                )
            ratings.append(rating)

    return covers, ratings


def stable_id(index: int, title: str) -> str:
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    short_slug = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")[:42]
    return f"snes-{index:04d}-{short_slug}"


def write_catalog(
    pdf_path: Path,
    data_path: Path,
    covers_path: Path,
    *,
    skip_covers: bool,
) -> None:
    text_entries = extract_text_entries(pdf_path)
    cover_entries, ratings = extract_visual_entries(pdf_path)

    if len(text_entries) != len(ratings):
        raise ValueError(
            "Katalog und Bewertungen stimmen nicht überein: "
            f"{len(text_entries)} Texte, {len(ratings)} Bewertungen"
        )

    # The source PDF intentionally has no cover image for this one catalog entry.
    missing_cover_title = "Williams Arcade's Greatest Hits"
    missing_cover_index = next(
        index
        for index, entry in enumerate(text_entries)
        if entry["title"] == missing_cover_title
    )
    aligned_covers: list[dict | None] = list(cover_entries)
    aligned_covers.insert(missing_cover_index, None)
    if len(text_entries) != len(aligned_covers):
        raise ValueError(
            "Katalog und Coverfolge stimmen nicht überein: "
            f"{len(text_entries)} Texte, {len(cover_entries)} Cover"
        )

    document = fitz.open(pdf_path)
    covers_path.mkdir(parents=True, exist_ok=True)

    catalog = []
    for index, (entry, image, rating) in enumerate(
        zip(text_entries, aligned_covers, ratings),
        start=1,
    ):
        game_id = stable_id(index, entry["title"])
        cover_name = f"{game_id}.jpg"
        if image is not None and not skip_covers:
            extracted = document.extract_image(image["xref"])
            if extracted["ext"] not in {"jpeg", "jpg"}:
                raise ValueError(
                    f"Unerwartetes Bildformat {extracted['ext']} für {entry['title']}"
                )
            (covers_path / cover_name).write_bytes(extracted["image"])

        catalog.append(
            {
                "id": game_id,
                **entry,
                "rarity": rating,
                "cover": f"/covers/{cover_name}" if image is not None else None,
                "sourcePage": image["page"] if image is not None else 103,
            }
        )

    data_path.parent.mkdir(parents=True, exist_ok=True)
    data_path.write_text(
        json.dumps(
            {
                "meta": {
                    "title": "SNES PAL Konsolenguide",
                    "currency": "EUR",
                    "priceUnit": "cent",
                    "sourceCreated": "2020-07-05",
                    "gameCount": len(catalog),
                    "conditions": ["module", "cib", "new", "box", "manual"],
                },
                "games": catalog,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    rarity_counts = {
        rating: sum(game["rarity"] == rating for game in catalog)
        for rating in (1, 2, 3)
    }
    print(
        json.dumps(
            {
                "games": len(catalog),
                "first": catalog[0]["title"],
                "last": catalog[-1]["title"],
                "rarity": rarity_counts,
                "data": str(data_path),
                "covers": str(covers_path),
            },
            ensure_ascii=False,
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--covers", type=Path, required=True)
    parser.add_argument("--skip-covers", action="store_true")
    args = parser.parse_args()

    write_catalog(
        args.pdf.resolve(),
        args.data.resolve(),
        args.covers.resolve(),
        skip_covers=args.skip_covers,
    )


if __name__ == "__main__":
    main()
