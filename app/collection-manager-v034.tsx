"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import SearchPanel from "./search-panel";
import { INITIAL_COLLECTION_SOURCE, INITIAL_COLLECTION_STATE } from "./initial-collection";
import {
  EMPTY_STATE,
  mergeCollectionStates,
  ownershipFilterKey,
  ownershipLabel,
  referencePriceKeys,
  referenceValue,
  sanitizeState,
  type CollectionState,
  type Game,
  type OwnedEntry,
  type PriceKey,
  type PriceMeta,
} from "./collection-model";

export type { Game, PriceKey, PriceMeta } from "./collection-model";

type View = "collection" | "catalog" | "search";

const STORAGE_KEY = "snes-pal-sammlung-v2";
const LEGACY_STORAGE_KEY = "snes-pal-sammlung-v1";

const CONDITION_LABELS: Record<PriceKey, string> = {
  module: "Modul",
  cib: "OVP / CIB",
  new: "Neu / Sealed",
  box: "Nur Box",
  manual: "Nur Anleitung",
};
const PRICE_KEYS = Object.keys(CONDITION_LABELS) as PriceKey[];

const OWNERSHIP_FILTERS = [
  ["all", "Alle Bestände"],
  ["sealed", "Neu / Sealed"],
  ["cib", "CIB"],
  ["module-box-manual", "Modul + Box + Anleitung"],
  ["module-manual", "Modul + Anleitung"],
  ["module-box", "Modul + Box"],
  ["module", "Nur Modul"],
  ["box-manual", "Box + Anleitung"],
  ["box", "Nur Box"],
  ["manual", "Nur Anleitung"],
] as const;

const SUMMARY_GROUPS = [
  ["sealed", "Neu / Sealed"],
  ["cib", "CIB"],
  ["module-manual", "Modul + Anleitung"],
  ["module-box", "Modul + Box"],
  ["module", "Nur Modul"],
  ["other", "Sonstige"],
] as const;

const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

function formatEuro(cents: number | null) {
  return cents === null ? "–" : euroFormatter.format(cents / 100);
}

function comparePrices(
  left: number | null,
  right: number | null,
  direction: "asc" | "desc",
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === "asc" ? left - right : right - left;
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("de-DE")
    .trim();
}

function defaultOwnedEntry(): OwnedEntry {
  const now = new Date().toISOString();
  return {
    components: { module: true, box: false, manual: false },
    completeInBox: false,
    sealed: false,
    quantity: 1,
    purchasePrice: null,
    purchaseDate: "",
    notes: "",
    addedAt: now,
    updatedAt: now,
  };
}

function Rarity({ value }: { value: number }) {
  return (
    <span
      className="rarity"
      aria-label={`${value} von 3 Seltenheitssternen`}
      title={`${value} von 3 Seltenheitssternen`}
    >
      {Array.from({ length: 3 }, (_, index) => (
        <span
          className={index < value ? "star is-filled" : "star"}
          aria-hidden="true"
          key={index}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function GameCover({
  game,
  compact = false,
}: {
  game: Game;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "game-cover is-compact" : "game-cover"}>
      {game.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.cover}
          alt={`PAL-Cover von ${game.title}`}
          loading="lazy"
        />
      ) : (
        <div className="cover-placeholder" aria-label="Kein Cover im Guide">
          <span>SNES</span>
          <small>Cover fehlt im Guide</small>
        </div>
      )}
    </div>
  );
}

function PriceGrid({
  game,
  highlights,
}: {
  game: Game;
  highlights?: PriceKey[];
}) {
  return (
    <div
      className="price-grid"
      aria-label={`Online-Richtwerte für ${game.title}`}
    >
      {PRICE_KEYS.map((key) => (
        <div
          className={[
            "price-cell",
            highlights?.includes(key) ? "is-highlighted" : "",
            game.prices[key] === null ? "is-unavailable" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={key}
          title={
            game.prices[key] === null
              ? "Für diesen Zustand liegt kein belastbarer Onlinewert vor."
              : undefined
          }
        >
          <span>{CONDITION_LABELS[key]}</span>
          <strong>{formatEuro(game.prices[key])}</strong>
        </div>
      ))}
    </div>
  );
}

function ComponentToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        alignItems: "center",
        border: "1px solid var(--border)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "row",
        gap: 9,
        minHeight: 42,
        padding: "9px 11px",
      }}
    >
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ height: 18, margin: 0, width: 18 }}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

function GameEditor({
  game,
  current,
  onClose,
  onSave,
  onRemove,
}: {
  game: Game;
  current?: OwnedEntry;
  onClose: () => void;
  onSave: (entry: OwnedEntry) => void;
  onRemove: () => void;
}) {
  const initial = current ?? defaultOwnedEntry();
  const [moduleOwned, setModuleOwned] = useState(initial.components.module);
  const [boxOwned, setBoxOwned] = useState(initial.components.box);
  const [manualOwned, setManualOwned] = useState(initial.components.manual);
  const [completeInBox, setCompleteInBox] = useState(initial.completeInBox);
  const [sealed, setSealed] = useState(initial.sealed);
  const [quantity, setQuantity] = useState(String(initial.quantity));
  const [purchasePrice, setPurchasePrice] = useState(
    initial.purchasePrice == null
      ? ""
      : (initial.purchasePrice / 100).toFixed(2).replace(".", ","),
  );
  const [purchaseDate, setPurchaseDate] = useState(initial.purchaseDate);
  const [notes, setNotes] = useState(initial.notes);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function setComponent(
    component: "module" | "box" | "manual",
    checked: boolean,
  ) {
    if (component === "module") setModuleOwned(checked);
    if (component === "box") setBoxOwned(checked);
    if (component === "manual") setManualOwned(checked);
    if (!checked) {
      setCompleteInBox(false);
      setSealed(false);
    }
  }

  function setCib(checked: boolean) {
    setCompleteInBox(checked);
    if (checked) {
      setModuleOwned(true);
      setBoxOwned(true);
      setManualOwned(true);
    } else {
      setSealed(false);
    }
  }

  function setSealedState(checked: boolean) {
    setSealed(checked);
    if (checked) {
      setCompleteInBox(true);
      setModuleOwned(true);
      setBoxOwned(true);
      setManualOwned(true);
    }
  }

  const draftEntry: OwnedEntry = {
    components: {
      module: moduleOwned,
      box: boxOwned,
      manual: manualOwned,
    },
    completeInBox,
    sealed,
    quantity: Math.min(
      99,
      Math.max(1, Number.parseInt(quantity || "1", 10) || 1),
    ),
    purchasePrice: null,
    purchaseDate,
    notes,
    addedAt: initial.addedAt,
    updatedAt: initial.updatedAt,
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!moduleOwned && !boxOwned && !manualOwned) {
      window.alert("Bitte mindestens Modul, Box oder Anleitung auswählen.");
      return;
    }
    const normalizedPrice = purchasePrice.trim().replace(",", ".");
    const priceInCents =
      normalizedPrice === ""
        ? null
        : Math.round(Number.parseFloat(normalizedPrice) * 100);
    if (
      priceInCents !== null &&
      (!Number.isFinite(priceInCents) || priceInCents < 0)
    ) {
      return;
    }
    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) return;

    const now = new Date().toISOString();
    onSave({
      ...draftEntry,
      quantity: Math.min(99, parsedQuantity),
      purchasePrice: priceInCents,
      purchaseDate,
      notes: notes.trim().slice(0, 1200),
      addedAt: current?.addedAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="editor-title"
        aria-modal="true"
        className="modal editor-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">
              {current ? "Eintrag bearbeiten" : "Spiel aufnehmen"}
            </p>
            <h2 id="editor-title">{game.title}</h2>
          </div>
          <button
            aria-label="Dialog schließen"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="editor-game">
          <GameCover compact game={game} />
          <div>
            <div className="game-meta">
              <span>{game.year}</span>
              <span>{game.publisher}</span>
            </div>
            <Rarity value={game.rarity} />
          </div>
        </div>

        <form className="editor-form" onSubmit={handleSubmit}>
          <div>
            <span style={{ display: "block", marginBottom: 7 }}>
              Vorhandene Bestandteile
            </span>
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
              }}
            >
              <ComponentToggle
                checked={moduleOwned}
                label="Modul"
                onChange={(checked) => setComponent("module", checked)}
              />
              <ComponentToggle
                checked={boxOwned}
                label="OVP / Box"
                onChange={(checked) => setComponent("box", checked)}
              />
              <ComponentToggle
                checked={manualOwned}
                label="Anleitung"
                onChange={(checked) => setComponent("manual", checked)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <ComponentToggle
              checked={completeInBox}
              label="Complete in Box (CIB)"
              onChange={setCib}
            />
            <ComponentToggle
              checked={sealed}
              label="Neu / Sealed"
              onChange={setSealedState}
            />
          </div>

          <div className="form-columns">
            <label>
              Anzahl
              <input
                inputMode="numeric"
                min="1"
                max="99"
                onChange={(event) => setQuantity(event.target.value)}
                step="1"
                type="number"
                value={quantity}
              />
            </label>
            <label>
              Kaufpreis gesamt in € <span className="optional">(optional)</span>
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => setPurchasePrice(event.target.value)}
                placeholder="z. B. 24,90"
                step="0.01"
                type="text"
                value={purchasePrice}
              />
            </label>
          </div>

          <label>
            Kaufdatum <span className="optional">(optional)</span>
            <input
              onChange={(event) => setPurchaseDate(event.target.value)}
              type="date"
              value={purchaseDate}
            />
          </label>

          <label>
            Notiz <span className="optional">(optional)</span>
            <textarea
              maxLength={1200}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Händler, Zustand oder Besonderheiten …"
              rows={3}
              value={notes}
            />
          </label>

          <div className="reference-row">
            <span>Richtwert für diesen Bestand</span>
            <strong>{formatEuro(referenceValue(game, draftEntry))}</strong>
          </div>
          <p className="source-note" style={{ marginTop: -4 }}>
            CIB nutzt den CIB-Richtwert. Bei Teilbeständen werden die
            Einzelrichtwerte von Modul, Box und Anleitung addiert. Die Anzahl
            wird beim Richtwert berücksichtigt.
          </p>

          <div className="modal-actions">
            {current ? (
              <button className="danger-button" onClick={onRemove} type="button">
                Entfernen
              </button>
            ) : null}
            <button className="primary-button" type="submit">
              {current ? "Änderungen speichern" : "Zur Sammlung hinzufügen"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function GamePicker({
  games,
  ownedIds,
  onChoose,
  onClose,
}: {
  games: Game[];
  ownedIds: Set<string>;
  onChoose: (gameId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalized = normalizeSearch(query);
  const candidates = games
    .filter((game) => !ownedIds.has(game.id))
    .filter((game) =>
      normalized
        ? normalizeSearch(
            `${game.title} ${game.publisher} ${game.developer} ${game.year}`,
          ).includes(normalized)
        : true,
    )
    .slice(0, 12);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="picker-title"
        aria-modal="true"
        className="modal picker-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Katalog durchsuchen</p>
            <h2 id="picker-title">Spiel hinzufügen</h2>
          </div>
          <button
            aria-label="Dialog schließen"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <label className="search-box">
          <span className="sr-only">Spiel suchen</span>
          <span aria-hidden="true">⌕</span>
          <input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titel, Entwickler oder Jahr …"
            type="search"
            value={query}
          />
        </label>
        <div className="picker-results">
          {candidates.map((game) => (
            <button
              className="picker-result"
              key={game.id}
              onClick={() => onChoose(game.id)}
              type="button"
            >
              <GameCover compact game={game} />
              <span>
                <strong>{game.title}</strong>
                <small>
                  {game.year} · {game.publisher}
                </small>
              </span>
              <span aria-hidden="true" className="picker-arrow">
                ›
              </span>
            </button>
          ))}
          {!candidates.length ? (
            <p className="empty-inline">Kein fehlendes Spiel gefunden.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default function CollectionManager({
  games,
  priceMeta,
}: {
  games: Game[];
  priceMeta: PriceMeta;
}) {
  const [activeView, setActiveView] = useState<View>("collection");
  const [state, setState] = useState<CollectionState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionCondition, setCollectionCondition] = useState("all");
  const [collectionSort, setCollectionSort] = useState("added");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogStatus, setCatalogStatus] = useState("all");
  const [catalogRarity, setCatalogRarity] = useState("all");
  const [catalogSort, setCatalogSort] = useState("title");
  const [catalogPrice, setCatalogPrice] = useState<PriceKey>("module");
  const [visibleCount, setVisibleCount] = useState(36);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [dataOpen, setDataOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gameById = useMemo(
    () => new Map(games.map((game) => [game.id, game])),
    [games],
  );
  const gameIds = useMemo(() => new Set(gameById.keys()), [gameById]);
  const ownedIds = useMemo(() => new Set(Object.keys(state.owned)), [state.owned]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const storedV2 = window.localStorage.getItem(STORAGE_KEY);
        if (storedV2) {
          setState(sanitizeState(JSON.parse(storedV2), gameIds));
        } else {
          const initial = sanitizeState(INITIAL_COLLECTION_STATE, gameIds);
          const storedV1 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
          if (storedV1) {
            const migrated = sanitizeState(JSON.parse(storedV1), gameIds);
            setState(mergeCollectionStates(initial, migrated));
          } else {
            setState(initial);
          }
        }
      } catch {
        setState(sanitizeState(INITIAL_COLLECTION_STATE, gameIds));
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [gameIds]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function showView(view: View) {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveEntry(gameId: string, entry: OwnedEntry) {
    const existed = Boolean(state.owned[gameId]);
    setState((current) => ({
      ...current,
      owned: { ...current.owned, [gameId]: entry },
    }));
    setEditingGameId(null);
    notify(existed ? "Eintrag aktualisiert" : "Zur Sammlung hinzugefügt");
  }

  function removeEntry(gameId: string) {
    const game = gameById.get(gameId);
    if (!game || !window.confirm(`${game.title} aus der Sammlung entfernen?`)) {
      return;
    }
    setState((current) => {
      const owned = { ...current.owned };
      delete owned[gameId];
      return { ...current, owned };
    });
    setEditingGameId(null);
    notify("Aus der Sammlung entfernt");
  }

  const ownedGames = useMemo(() => {
    const normalized = normalizeSearch(collectionQuery);
    const rows = Object.entries(state.owned)
      .map(([gameId, entry]) => {
        const game = gameById.get(gameId);
        return game ? { game, entry } : null;
      })
      .filter((row): row is { game: Game; entry: OwnedEntry } => Boolean(row))
      .filter(({ game, entry }) => {
        const matchesQuery =
          !normalized ||
          normalizeSearch(
            `${game.title} ${game.publisher} ${game.developer} ${game.year}`,
          ).includes(normalized);
        const matchesCondition =
          collectionCondition === "all" ||
          ownershipFilterKey(entry) === collectionCondition;
        return matchesQuery && matchesCondition;
      });

    rows.sort((left, right) => {
      if (collectionSort === "title") {
        return left.game.title.localeCompare(right.game.title, "de");
      }
      if (collectionSort === "year") {
        return right.game.year - left.game.year;
      }
      if (collectionSort === "value") {
        return comparePrices(
          referenceValue(left.game, left.entry),
          referenceValue(right.game, right.entry),
          "desc",
        );
      }
      if (collectionSort === "rarity") {
        return (
          right.game.rarity - left.game.rarity ||
          left.game.title.localeCompare(right.game.title, "de")
        );
      }
      return right.entry.addedAt.localeCompare(left.entry.addedAt);
    });
    return rows;
  }, [
    collectionCondition,
    collectionQuery,
    collectionSort,
    gameById,
    state.owned,
  ]);

  const filteredCatalog = useMemo(() => {
    const normalized = normalizeSearch(catalogQuery);
    const rows = games.filter((game) => {
      const matchesQuery =
        !normalized ||
        normalizeSearch(
          `${game.title} ${game.publisher} ${game.developer} ${game.year}`,
        ).includes(normalized);
      const isOwned = ownedIds.has(game.id);
      const matchesStatus =
        catalogStatus === "all" ||
        (catalogStatus === "owned" && isOwned) ||
        (catalogStatus === "missing" && !isOwned);
      const matchesRarity =
        catalogRarity === "all" ||
        game.rarity === Number.parseInt(catalogRarity, 10);
      return matchesQuery && matchesStatus && matchesRarity;
    });
    rows.sort((left, right) => {
      if (catalogSort === "year") {
        return (
          right.year - left.year || left.title.localeCompare(right.title, "de")
        );
      }
      if (catalogSort === "rarity") {
        return (
          right.rarity - left.rarity ||
          left.title.localeCompare(right.title, "de")
        );
      }
      if (catalogSort === "value-low") {
        return comparePrices(
          left.prices[catalogPrice],
          right.prices[catalogPrice],
          "asc",
        );
      }
      if (catalogSort === "value-high") {
        return comparePrices(
          left.prices[catalogPrice],
          right.prices[catalogPrice],
          "desc",
        );
      }
      return left.title.localeCompare(right.title, "de");
    });
    return rows;
  }, [
    catalogPrice,
    catalogQuery,
    catalogRarity,
    catalogSort,
    catalogStatus,
    games,
    ownedIds,
  ]);

  const ownedCount = ownedIds.size;
  const ownedCopies = Object.values(state.owned).reduce(
    (sum, entry) => sum + entry.quantity,
    0,
  );
  const missingCount = games.length - ownedCount;
  const progress = games.length ? (ownedCount / games.length) * 100 : 0;
  const referenceTotal = Object.entries(state.owned).reduce(
    (sum, [gameId, entry]) => {
      const game = gameById.get(gameId);
      return sum + (game ? referenceValue(game, entry) ?? 0 : 0);
    },
    0,
  );
  const purchaseEntries = Object.values(state.owned).filter(
    (entry) => entry.purchasePrice !== null,
  );
  const purchaseTotal = purchaseEntries.reduce(
    (sum, entry) => sum + (entry.purchasePrice ?? 0),
    0,
  );

  const summaryCounts = SUMMARY_GROUPS.map(([key, label]) => {
    const count = Object.values(state.owned).filter((entry) => {
      const currentKey = ownershipFilterKey(entry);
      if (key === "other") {
        return !["sealed", "cib", "module-manual", "module-box", "module"].includes(
          currentKey,
        );
      }
      return currentKey === key;
    }).length;
    return { key, label, count };
  });

  function exportData() {
    const payload = {
      app: "SNES PAL Sammlung",
      version: 2,
      exportedAt: new Date().toISOString(),
      data: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `snes-pal-sammlung-v2-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Datensicherung erstellt");
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = sanitizeState(JSON.parse(await file.text()), gameIds);
      const count = Object.keys(imported.owned).length;
      if (
        !window.confirm(
          `Sicherung mit ${count} Spielen importieren und aktuelle Sammlung ersetzen?`,
        )
      ) {
        return;
      }
      setState(imported);
      setDataOpen(false);
      notify("Datensicherung importiert");
    } catch {
      window.alert("Diese Datei ist keine gültige SNES-Sicherung.");
    } finally {
      event.target.value = "";
    }
  }

  function resetCollection() {
    if (
      !window.confirm(
        `Sammlung auf den integrierten Excel-Ausgangsbestand mit ${INITIAL_COLLECTION_SOURCE.importedGames} Spielen zurücksetzen? Eigene Änderungen werden dabei gelöscht.`,
      )
    ) {
      return;
    }
    setState(sanitizeState(INITIAL_COLLECTION_STATE, gameIds));
    setDataOpen(false);
    notify("Excel-Ausgangsbestand wiederhergestellt");
  }

  const editingGame = editingGameId
    ? gameById.get(editingGameId) ?? null
    : null;

  return (
    <main>
      <div className="sticky-shell">
        <header className="app-header">
          <div className="header-inner">
            <div className="brand">
              <div className="brand-mark" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div>
                <div className="title-row">
                  <h1>SNES PAL Sammlung</h1>
                  <span className="version-badge">Version 0.3.4</span>
                </div>
                <p>Sammlungsmanager mit 530 PAL-Spielen</p>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="primary-button header-add"
                onClick={() => setPickerOpen(true)}
                type="button"
              >
                <span className="wide-label">Spiel hinzufügen</span>
                <span className="short-label">+ Spiel</span>
              </button>
              <button
                aria-label="Daten verwalten"
                className="icon-button"
                onClick={() => setDataOpen(true)}
                title="Daten sichern und wiederherstellen"
                type="button"
              >
                •••
              </button>
            </div>
          </div>
        </header>
        <nav aria-label="Bereiche" className="tabs">
          <button
            className={activeView === "collection" ? "tab is-active" : "tab"}
            onClick={() => showView("collection")}
            type="button"
          >
            Sammlung
          </button>
          <button
            className={activeView === "catalog" ? "tab is-active" : "tab"}
            onClick={() => showView("catalog")}
            type="button"
          >
            Katalog
          </button>
          <button
            className={activeView === "search" ? "tab is-active" : "tab"}
            onClick={() => showView("search")}
            type="button"
          >
            Suche
          </button>
        </nav>
      </div>

      <div className="page-shell">
        {activeView === "collection" ? (
          <>
            <section aria-label="Sammlungsübersicht" className="stats-grid">
              <article className="stat-card">
                <span>Sammlung</span>
                <strong>{hydrated ? ownedCount : "–"}</strong>
                <small>
                  {hydrated && ownedCopies !== ownedCount
                    ? `${ownedCopies} Exemplare · `
                    : ""}
                  von {games.length} Spielen
                </small>
              </article>
              <article className="stat-card">
                <span>Fehlend</span>
                <strong>{hydrated ? missingCount : "–"}</strong>
                <small>PAL-Titel</small>
              </article>
              <article className="stat-card">
                <span>Fortschritt</span>
                <strong>{hydrated ? `${progress.toFixed(1)} %` : "–"}</strong>
                <small>vollständiger Katalog</small>
              </article>
              <article className="stat-card is-accent">
                <span>Online-Richtwert</span>
                <strong>{hydrated ? formatEuro(referenceTotal) : "–"}</strong>
                <small>nach vorhandenem Bestand</small>
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="panel progress-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Dein Überblick</p>
                    <h2>Sammlungsfortschritt</h2>
                  </div>
                  <span className="badge">
                    {ownedCount} von {games.length}
                  </span>
                </div>
                <div className="progress-layout">
                  <div
                    aria-label={`${progress.toFixed(1)} Prozent gesammelt`}
                    className="progress-ring"
                    style={
                      { "--progress": `${progress * 3.6}deg` } as CSSProperties
                    }
                  >
                    <span>
                      <strong>{progress.toFixed(1)}%</strong>
                      <small>komplett</small>
                    </span>
                  </div>
                  <div className="condition-summary">
                    {summaryCounts.map(({ key, label, count }) => (
                      <div key={key}>
                        <span>{label}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="panel value-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Werte & Ausgaben</p>
                    <h2>Finanzieller Überblick</h2>
                  </div>
                </div>
                <div className="value-list">
                  <div>
                    <span>Online-Richtwert der Sammlung</span>
                    <strong>{formatEuro(referenceTotal)}</strong>
                  </div>
                  <div>
                    <span>Erfasste Kaufpreise</span>
                    <strong>{formatEuro(purchaseTotal)}</strong>
                    <small>
                      bei {purchaseEntries.length} von {ownedCount} Spielen
                    </small>
                  </div>
                </div>
                <p className="source-note">
                  CIB-Einträge werden mit dem CIB-Richtwert bewertet.
                  Teilbestände wie Modul + Anleitung werden aus den
                  Einzelrichtwerten der vorhandenen Bestandteile berechnet.
                  Online-Richtwerte von{" "}
                  <a href={priceMeta.sourceUrl} rel="noreferrer" target="_blank">
                    {priceMeta.source}
                  </a>{" "}
                  für PAL-Ausgaben, geprüft am{" "}
                  {formatIsoDate(priceMeta.sourceChecked)} und zum EZB-Tageskurs
                  vom {formatIsoDate(priceMeta.exchangeRateDate)} in Euro
                  umgerechnet. Ohne typische Versandkosten.
                </p>
                <p className="source-note">
                  Integrierter Ausgangsbestand: {INITIAL_COLLECTION_SOURCE.importedGames} Spiele
                  aus {INITIAL_COLLECTION_SOURCE.file}, Kaufpreise{" "}
                  {formatEuro(INITIAL_COLLECTION_SOURCE.purchaseTotalCents)}.
                  Super Game Boy bleibt als Zubehör außerhalb des 530-Spiele-Katalogs.
                </p>
              </article>
            </section>
          </>
        ) : null}

        {activeView === "collection" ? (
          <section className="panel main-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Inventar</p>
                <h2>Meine Spiele</h2>
              </div>
              <span className="badge">{ownedGames.length} angezeigt</span>
            </div>

            <div className="toolbar">
              <label className="search-box">
                <span className="sr-only">Sammlung durchsuchen</span>
                <span aria-hidden="true">⌕</span>
                <input
                  onChange={(event) => setCollectionQuery(event.target.value)}
                  placeholder="Sammlung durchsuchen …"
                  type="search"
                  value={collectionQuery}
                />
              </label>
              <label>
                <span>Bestand</span>
                <select
                  onChange={(event) => setCollectionCondition(event.target.value)}
                  value={collectionCondition}
                >
                  {OWNERSHIP_FILTERS.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Sortierung</span>
                <select
                  onChange={(event) => setCollectionSort(event.target.value)}
                  value={collectionSort}
                >
                  <option value="added">Zuletzt hinzugefügt</option>
                  <option value="title">Titel A–Z</option>
                  <option value="year">Jahr, neu zuerst</option>
                  <option value="value">Onlinewert, hoch zuerst</option>
                  <option value="rarity">Seltenheit</option>
                </select>
              </label>
            </div>

            {ownedGames.length ? (
              <div className="game-list">
                {ownedGames.map(({ game, entry }) => (
                  <article className="game-card owned-card" key={game.id}>
                    <GameCover game={game} />
                    <div className="game-card-body">
                      <div className="game-card-topline">
                        <div>
                          <h3>{game.title}</h3>
                          <div className="game-meta">
                            <span>{game.year}</span>
                            <span>{game.publisher}</span>
                          </div>
                        </div>
                        <Rarity value={game.rarity} />
                      </div>
                      <div className="owned-summary">
                        <div>
                          <span>Bestand</span>
                          <strong>{ownershipLabel(entry)}</strong>
                        </div>
                        <div>
                          <span>Onlinewert</span>
                          <strong>{formatEuro(referenceValue(game, entry))}</strong>
                        </div>
                        <div>
                          <span>Kaufpreis</span>
                          <strong>
                            {entry.purchasePrice == null
                              ? "–"
                              : formatEuro(entry.purchasePrice)}
                          </strong>
                        </div>
                      </div>
                      {entry.quantity > 1 ? (
                        <p className="game-note">Anzahl: {entry.quantity}</p>
                      ) : null}
                      {entry.notes ? (
                        <p className="game-note">{entry.notes}</p>
                      ) : null}
                      <button
                        className="secondary-button card-action"
                        onClick={() => setEditingGameId(game.id)}
                        type="button"
                      >
                        Eintrag bearbeiten
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-console" aria-hidden="true">
                  <span>+</span>
                </div>
                <h3>
                  {ownedCount
                    ? "Keine Spiele passen zu diesem Filter"
                    : "Deine Sammlung ist leer"}
                </h3>
                <p>
                  {ownedCount
                    ? "Ändere die Suche oder den Bestandsfilter."
                    : "Füge ein Spiel hinzu oder stelle den integrierten Excel-Ausgangsbestand über die Datenverwaltung wieder her."}
                </p>
              </div>
            )}
          </section>
        ) : activeView === "catalog" ? (
          <section className="panel main-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Vollständige Übersicht</p>
                <h2>PAL-Katalog</h2>
              </div>
              <span className="badge">
                {filteredCatalog.length} von {games.length}
              </span>
            </div>

            <div className="catalog-toolbar">
              <label className="search-box catalog-search">
                <span className="sr-only">Katalog durchsuchen</span>
                <span aria-hidden="true">⌕</span>
                <input
                  onChange={(event) => {
                    setCatalogQuery(event.target.value);
                    setVisibleCount(36);
                  }}
                  placeholder="Titel, Hersteller oder Jahr suchen …"
                  type="search"
                  value={catalogQuery}
                />
              </label>
              <div className="catalog-controls">
                <label>
                  <span>Status</span>
                  <select
                    onChange={(event) => {
                      setCatalogStatus(event.target.value);
                      setVisibleCount(36);
                    }}
                    value={catalogStatus}
                  >
                    <option value="all">Alle Spiele</option>
                    <option value="owned">In Sammlung</option>
                    <option value="missing">Fehlend</option>
                  </select>
                </label>
                <label>
                  <span>Seltenheit</span>
                  <select
                    onChange={(event) => {
                      setCatalogRarity(event.target.value);
                      setVisibleCount(36);
                    }}
                    value={catalogRarity}
                  >
                    <option value="all">Alle Sterne</option>
                    <option value="1">★</option>
                    <option value="2">★★</option>
                    <option value="3">★★★</option>
                  </select>
                </label>
                <label>
                  <span>Preisvergleich</span>
                  <select
                    onChange={(event) => {
                      setCatalogPrice(event.target.value as PriceKey);
                      setVisibleCount(36);
                    }}
                    value={catalogPrice}
                  >
                    {PRICE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {CONDITION_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Sortierung</span>
                  <select
                    onChange={(event) => {
                      setCatalogSort(event.target.value);
                      setVisibleCount(36);
                    }}
                    value={catalogSort}
                  >
                    <option value="title">Titel A–Z</option>
                    <option value="year">Jahr, neu zuerst</option>
                    <option value="rarity">Seltenheit</option>
                    <option value="value-low">Preis, niedrig zuerst</option>
                    <option value="value-high">Preis, hoch zuerst</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="catalog-list">
              {filteredCatalog.slice(0, visibleCount).map((game) => {
                const entry = state.owned[game.id];
                return (
                  <article
                    className={
                      entry
                        ? "game-card catalog-card is-owned"
                        : "game-card catalog-card"
                    }
                    key={game.id}
                  >
                    <GameCover game={game} />
                    <div className="game-card-body">
                      <div className="game-card-topline">
                        <div>
                          <div className="catalog-status-line">
                            {entry ? (
                              <span className="owned-badge">In Sammlung</span>
                            ) : (
                              <span className="missing-badge">Fehlend</span>
                            )}
                          </div>
                          <h3>{game.title}</h3>
                          <div className="game-meta">
                            <span>{game.year}</span>
                            <span>{game.publisher}</span>
                            <span>{game.developer}</span>
                          </div>
                        </div>
                        <Rarity value={game.rarity} />
                      </div>
                      <PriceGrid
                        game={game}
                        highlights={
                          entry ? referencePriceKeys(entry) : [catalogPrice]
                        }
                      />
                      {entry ? (
                        <p className="game-note">
                          {ownershipLabel(entry)}
                          {entry.quantity > 1 ? ` · ${entry.quantity}×` : ""}
                        </p>
                      ) : null}
                      <button
                        className={
                          entry
                            ? "secondary-button card-action"
                            : "primary-button card-action"
                        }
                        onClick={() => setEditingGameId(game.id)}
                        type="button"
                      >
                        {entry
                          ? "Sammlungseintrag bearbeiten"
                          : "Zur Sammlung hinzufügen"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredCatalog.length > visibleCount ? (
              <button
                className="secondary-button load-more"
                onClick={() => setVisibleCount((count) => count + 36)}
                type="button"
              >
                Weitere 36 Spiele anzeigen
              </button>
            ) : null}
            {!filteredCatalog.length ? (
              <div className="empty-state compact-empty">
                <h3>Kein Spiel gefunden</h3>
                <p>Ändere den Suchbegriff oder einen Filter.</p>
              </div>
            ) : null}
          </section>
        ) : null}

        <SearchPanel
          active={activeView === "search"}
          games={games}
          onAddGame={(gameId) => setEditingGameId(gameId)}
          ownedIds={ownedIds}
        />
      </div>

      <footer>
        <p>SNES PAL Sammlung · Version 0.3.4</p>
        <p>
          Sammlung, Suchfortschritt und Treffer bleiben lokal in diesem Browser.
        </p>
      </footer>

      {pickerOpen ? (
        <GamePicker
          games={games}
          onChoose={(gameId) => {
            setPickerOpen(false);
            setEditingGameId(gameId);
          }}
          onClose={() => setPickerOpen(false)}
          ownedIds={ownedIds}
        />
      ) : null}

      {editingGame ? (
        <GameEditor
          current={state.owned[editingGame.id]}
          game={editingGame}
          onClose={() => setEditingGameId(null)}
          onRemove={() => removeEntry(editingGame.id)}
          onSave={(entry) => saveEntry(editingGame.id, entry)}
        />
      ) : null}

      {dataOpen ? (
        <div
          className="modal-backdrop"
          onMouseDown={() => setDataOpen(false)}
          role="presentation"
        >
          <section
            aria-labelledby="data-title"
            aria-modal="true"
            className="modal data-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Lokale Daten</p>
                <h2 id="data-title">Sammlung sichern</h2>
              </div>
              <button
                aria-label="Dialog schließen"
                className="icon-button"
                onClick={() => setDataOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="modal-copy">
              Version 2 sichert Bestandteile, CIB-Status, Anzahl, Kaufpreise,
              Kaufdatum und Notizen. Alte Version-1-Sicherungen werden beim
              Import automatisch migriert.
            </p>
            <div className="data-actions">
              <button className="primary-button" onClick={exportData} type="button">
                Datensicherung exportieren
              </button>
              <label className="secondary-button file-button">
                Datensicherung importieren
                <input
                  accept="application/json,.json"
                  onChange={importData}
                  type="file"
                />
              </label>
              <button
                className="danger-button"
                onClick={resetCollection}
                type="button"
              >
                Excel-Ausgangsbestand wiederherstellen
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? (
        <div aria-live="polite" className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
