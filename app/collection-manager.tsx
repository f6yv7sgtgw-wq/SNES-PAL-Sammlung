"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SearchPanel from "./search-panel";

export type PriceKey = "module" | "cib" | "new" | "box" | "manual";

export type Game = {
  id: string;
  title: string;
  developer: string;
  publisher: string;
  year: number;
  rarity: 1 | 2 | 3;
  prices: Record<PriceKey, number | null>;
  cover: string | null;
  sourcePage: number;
};

export type PriceMeta = {
  source: string;
  sourceUrl: string;
  sourceChecked: string;
  exchangeRateSource: string;
  exchangeRateDate: string;
  usdPerEur: number;
  missingPriceCount: number;
};

type OwnedEntry = {
  condition: PriceKey;
  purchasePrice: number | null;
  purchaseDate: string;
  notes: string;
  addedAt: string;
  updatedAt: string;
};

type CollectionState = {
  version: 1;
  owned: Record<string, OwnedEntry>;
};

type View = "collection" | "catalog" | "search";

const STORAGE_KEY = "snes-pal-sammlung-v1";
const CONDITION_LABELS: Record<PriceKey, string> = {
  module: "Modul",
  cib: "OVP / CIB",
  new: "Neu / Sealed",
  box: "Nur Box",
  manual: "Nur Anleitung",
};
const PRICE_KEYS = Object.keys(CONDITION_LABELS) as PriceKey[];

const EMPTY_STATE: CollectionState = {
  version: 1,
  owned: {},
};

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

function isPriceKey(value: unknown): value is PriceKey {
  return typeof value === "string" && PRICE_KEYS.includes(value as PriceKey);
}

function sanitizeState(
  input: unknown,
  gameIds: Set<string>,
): CollectionState {
  const candidate =
    input && typeof input === "object" && "data" in input
      ? (input as { data: unknown }).data
      : input;
  const owned =
    candidate &&
    typeof candidate === "object" &&
    "owned" in candidate &&
    (candidate as { owned: unknown }).owned &&
    typeof (candidate as { owned: unknown }).owned === "object"
      ? ((candidate as { owned: Record<string, unknown> }).owned ?? {})
      : {};

  const result: CollectionState = { version: 1, owned: {} };
  for (const [gameId, rawEntry] of Object.entries(owned)) {
    if (!gameIds.has(gameId) || !rawEntry || typeof rawEntry !== "object") {
      continue;
    }
    const entry = rawEntry as Partial<OwnedEntry>;
    const condition = isPriceKey(entry.condition) ? entry.condition : "module";
    result.owned[gameId] = {
      condition,
      purchasePrice:
        typeof entry.purchasePrice === "number" &&
        Number.isFinite(entry.purchasePrice) &&
        entry.purchasePrice >= 0
          ? Math.round(entry.purchasePrice)
          : null,
      purchaseDate:
        typeof entry.purchaseDate === "string"
          ? entry.purchaseDate.slice(0, 10)
          : "",
      notes: typeof entry.notes === "string" ? entry.notes.slice(0, 1200) : "",
      addedAt:
        typeof entry.addedAt === "string"
          ? entry.addedAt
          : new Date().toISOString(),
      updatedAt:
        typeof entry.updatedAt === "string"
          ? entry.updatedAt
          : new Date().toISOString(),
    };
  }
  return result;
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
        // The source images are tiny extracted JPEGs; serving them unchanged avoids
        // producing hundreds of larger transformed variants.
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
  highlight,
}: {
  game: Game;
  highlight?: PriceKey;
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
            highlight === key ? "is-highlighted" : "",
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
  const [condition, setCondition] = useState<PriceKey>(
    current?.condition ?? "module",
  );
  const [purchasePrice, setPurchasePrice] = useState(
    current?.purchasePrice == null
      ? ""
      : (current.purchasePrice / 100).toFixed(2).replace(".", ","),
  );
  const [purchaseDate, setPurchaseDate] = useState(
    current?.purchaseDate ?? "",
  );
  const [notes, setNotes] = useState(current?.notes ?? "");

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
    const now = new Date().toISOString();
    onSave({
      condition,
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
            <p className="eyebrow">{current ? "Eintrag bearbeiten" : "Spiel aufnehmen"}</p>
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
          <label>
            Zustand
            <select
              onChange={(event) => setCondition(event.target.value as PriceKey)}
              value={condition}
            >
              {PRICE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CONDITION_LABELS[key]} · {formatEuro(game.prices[key])}
                </option>
              ))}
            </select>
          </label>

          <div className="form-columns">
            <label>
              Kaufpreis in € <span className="optional">(optional)</span>
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
            <label>
              Kaufdatum <span className="optional">(optional)</span>
              <input
                onChange={(event) => setPurchaseDate(event.target.value)}
                type="date"
                value={purchaseDate}
              />
            </label>
          </div>

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
            <span>Online-Richtwert</span>
            <strong>{formatEuro(game.prices[condition])}</strong>
          </div>

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
  const [collectionCondition, setCollectionCondition] = useState<
    PriceKey | "all"
  >("all");
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
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setState(sanitizeState(JSON.parse(stored), gameIds));
      } catch {
        // A damaged local backup should never prevent the catalog from opening.
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
    setState((current) => ({
      ...current,
      owned: { ...current.owned, [gameId]: entry },
    }));
    setEditingGameId(null);
    notify(
      state.owned[gameId]
        ? "Eintrag aktualisiert"
        : "Zur Sammlung hinzugefügt",
    );
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
          entry.condition === collectionCondition;
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
          left.game.prices[left.entry.condition],
          right.game.prices[right.entry.condition],
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
  const missingCount = games.length - ownedCount;
  const progress = games.length ? (ownedCount / games.length) * 100 : 0;
  const referenceValue = Object.entries(state.owned).reduce(
    (sum, [gameId, entry]) => {
      const game = gameById.get(gameId);
      return sum + (game?.prices[entry.condition] ?? 0);
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
  const conditionCounts = PRICE_KEYS.map((condition) => ({
    condition,
    count: Object.values(state.owned).filter(
      (entry) => entry.condition === condition,
    ).length,
  }));

  function exportData() {
    const payload = {
      app: "SNES PAL Sammlung",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `snes-pal-sammlung-${new Date()
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
        "Die gesamte Sammlung samt Kaufpreisen und Notizen wirklich löschen?",
      )
    ) {
      return;
    }
    setState(EMPTY_STATE);
    setDataOpen(false);
    notify("Sammlung zurückgesetzt");
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
                  <span className="version-badge">Version 0.3.2</span>
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
            <small>von {games.length} Spielen</small>
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
            <strong>{hydrated ? formatEuro(referenceValue) : "–"}</strong>
            <small>nach erfasstem Zustand</small>
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
                style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}
              >
                <span>
                  <strong>{progress.toFixed(1)}%</strong>
                  <small>komplett</small>
                </span>
              </div>
              <div className="condition-summary">
                {conditionCounts.map(({ condition, count }) => (
                  <div key={condition}>
                    <span>{CONDITION_LABELS[condition]}</span>
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
                <strong>{formatEuro(referenceValue)}</strong>
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
              Online-Richtwerte von{" "}
              <a href={priceMeta.sourceUrl} rel="noreferrer" target="_blank">
                {priceMeta.source}
              </a>{" "}
              für PAL-Ausgaben, geprüft am{" "}
              {formatIsoDate(priceMeta.sourceChecked)} und zum EZB-Tageskurs
              vom {formatIsoDate(priceMeta.exchangeRateDate)} in Euro
              umgerechnet. Ohne typische Versandkosten. Für{" "}
              {priceMeta.missingPriceCount} von {games.length * PRICE_KEYS.length}{" "}
              Zustandswerten veröffentlicht die Quelle keinen Marktwert; dort
              steht „–“.
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
                <span>Zustand</span>
                <select
                  onChange={(event) =>
                    setCollectionCondition(
                      event.target.value as PriceKey | "all",
                    )
                  }
                  value={collectionCondition}
                >
                  <option value="all">Alle Zustände</option>
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
                          <span>Zustand</span>
                          <strong>{CONDITION_LABELS[entry.condition]}</strong>
                        </div>
                        <div>
                          <span>Onlinewert</span>
                          <strong>{formatEuro(game.prices[entry.condition])}</strong>
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
                    : "Deine Sammlung ist noch leer"}
                </h3>
                <p>
                  {ownedCount
                    ? "Ändere die Suche oder den Zustandsfilter."
                    : "Füge dein erstes Spiel hinzu oder öffne den vollständigen PAL-Katalog."}
                </p>
                {!ownedCount ? (
                  <div className="empty-actions">
                    <button
                      className="primary-button"
                      onClick={() => setPickerOpen(true)}
                      type="button"
                    >
                      Erstes Spiel hinzufügen
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => showView("catalog")}
                      type="button"
                    >
                      Katalog öffnen
                    </button>
                  </div>
                ) : null}
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
                    className={entry ? "game-card catalog-card is-owned" : "game-card catalog-card"}
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
                        highlight={entry?.condition ?? catalogPrice}
                      />
                      <button
                        className={entry ? "secondary-button card-action" : "primary-button card-action"}
                        onClick={() => setEditingGameId(game.id)}
                        type="button"
                      >
                        {entry ? "Sammlungseintrag bearbeiten" : "Zur Sammlung hinzufügen"}
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
        <p>SNES PAL Sammlung · Version 0.3.2</p>
        <p>Sammlung, Suchfortschritt und Treffer bleiben lokal in diesem Browser.</p>
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
              Sammlung, Zustände, Kaufpreise und Notizen werden als JSON-Datei
              gesichert und können später wieder eingelesen werden.
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
                Sammlung zurücksetzen
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
