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

export type OwnedComponents = {
  module: boolean;
  box: boolean;
  manual: boolean;
};

export type OwnedEntry = {
  components: OwnedComponents;
  completeInBox: boolean;
  sealed: boolean;
  quantity: number;
  purchasePrice: number | null;
  purchaseDate: string;
  notes: string;
  addedAt: string;
  updatedAt: string;
};

export type CollectionState = {
  version: 2;
  owned: Record<string, OwnedEntry>;
};

export const EMPTY_STATE: CollectionState = {
  version: 2,
  owned: {},
};

const PRICE_KEYS: PriceKey[] = ["module", "cib", "new", "box", "manual"];

export function isPriceKey(value: unknown): value is PriceKey {
  return typeof value === "string" && PRICE_KEYS.includes(value as PriceKey);
}

function bool(value: unknown) {
  return value === true;
}

function validCents(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;
}

function validQuantity(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.min(99, Math.max(1, Math.round(value)))
    : 1;
}

export function componentsFromLegacyCondition(condition: PriceKey): {
  components: OwnedComponents;
  completeInBox: boolean;
  sealed: boolean;
} {
  if (condition === "new") {
    return {
      components: { module: true, box: true, manual: true },
      completeInBox: true,
      sealed: true,
    };
  }
  if (condition === "cib") {
    return {
      components: { module: true, box: true, manual: true },
      completeInBox: true,
      sealed: false,
    };
  }
  if (condition === "box") {
    return {
      components: { module: false, box: true, manual: false },
      completeInBox: false,
      sealed: false,
    };
  }
  if (condition === "manual") {
    return {
      components: { module: false, box: false, manual: true },
      completeInBox: false,
      sealed: false,
    };
  }
  return {
    components: { module: true, box: false, manual: false },
    completeInBox: false,
    sealed: false,
  };
}

export function sanitizeOwnedEntry(rawEntry: unknown): OwnedEntry | null {
  if (!rawEntry || typeof rawEntry !== "object") return null;
  const raw = rawEntry as Record<string, unknown>;

  let components: OwnedComponents;
  let completeInBox = false;
  let sealed = false;

  if (raw.components && typeof raw.components === "object") {
    const rawComponents = raw.components as Record<string, unknown>;
    components = {
      module: bool(rawComponents.module),
      box: bool(rawComponents.box),
      manual: bool(rawComponents.manual),
    };
    completeInBox =
      bool(raw.completeInBox) &&
      components.module &&
      components.box &&
      components.manual;
    sealed =
      bool(raw.sealed) &&
      components.module &&
      components.box &&
      components.manual;
  } else if (isPriceKey(raw.condition)) {
    const migrated = componentsFromLegacyCondition(raw.condition);
    components = migrated.components;
    completeInBox = migrated.completeInBox;
    sealed = migrated.sealed;
  } else if ("cart" in raw || "box" in raw || "manual" in raw) {
    components = {
      module: bool(raw.cart),
      box: bool(raw.box),
      manual: bool(raw.manual),
    };
    completeInBox =
      components.module && components.box && components.manual;
  } else {
    components = { module: true, box: false, manual: false };
  }

  if (sealed) completeInBox = true;

  return {
    components,
    completeInBox,
    sealed,
    quantity: validQuantity(raw.quantity),
    purchasePrice: validCents(raw.purchasePrice),
    purchaseDate:
      typeof raw.purchaseDate === "string" ? raw.purchaseDate.slice(0, 10) : "",
    notes: typeof raw.notes === "string" ? raw.notes.slice(0, 1200) : "",
    addedAt:
      typeof raw.addedAt === "string" ? raw.addedAt : new Date().toISOString(),
    updatedAt:
      typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}

export function sanitizeState(
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

  const result: CollectionState = { version: 2, owned: {} };
  for (const [gameId, rawEntry] of Object.entries(owned)) {
    if (!gameIds.has(gameId)) continue;
    const entry = sanitizeOwnedEntry(rawEntry);
    if (entry) result.owned[gameId] = entry;
  }
  return result;
}

export function mergeCollectionStates(
  base: CollectionState,
  overlay: CollectionState,
): CollectionState {
  return {
    version: 2,
    owned: {
      ...base.owned,
      ...overlay.owned,
    },
  };
}

export function ownershipLabel(entry: OwnedEntry): string {
  if (entry.sealed) return "Neu / Sealed";
  if (entry.completeInBox) return "CIB";
  const { module, box, manual } = entry.components;
  if (module && box && manual) return "Modul + Box + Anleitung";
  if (module && box) return "Modul + Box";
  if (module && manual) return "Modul + Anleitung";
  if (box && manual) return "Box + Anleitung";
  if (module) return "Nur Modul";
  if (box) return "Nur Box";
  if (manual) return "Nur Anleitung";
  return "Ohne Komponenten";
}

export function ownershipFilterKey(entry: OwnedEntry): string {
  if (entry.sealed) return "sealed";
  if (entry.completeInBox) return "cib";
  const { module, box, manual } = entry.components;
  if (module && box && manual) return "module-box-manual";
  if (module && box) return "module-box";
  if (module && manual) return "module-manual";
  if (box && manual) return "box-manual";
  if (module) return "module";
  if (box) return "box";
  if (manual) return "manual";
  return "none";
}

export function referencePriceKeys(entry: OwnedEntry): PriceKey[] {
  if (entry.sealed) return ["new"];
  if (entry.completeInBox) return ["cib"];
  const keys: PriceKey[] = [];
  if (entry.components.module) keys.push("module");
  if (entry.components.box) keys.push("box");
  if (entry.components.manual) keys.push("manual");
  return keys;
}

export function referenceUnitValue(
  game: Pick<Game, "prices">,
  entry: OwnedEntry,
): number | null {
  if (entry.sealed) return game.prices.new;

  if (entry.completeInBox) {
    if (game.prices.cib !== null) return game.prices.cib;
    const fallback = [
      game.prices.module,
      game.prices.box,
      game.prices.manual,
    ];
    return fallback.every((value) => value !== null)
      ? fallback.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
  }

  const values: Array<number | null> = [];
  if (entry.components.module) values.push(game.prices.module);
  if (entry.components.box) values.push(game.prices.box);
  if (entry.components.manual) values.push(game.prices.manual);
  if (!values.length || values.some((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function referenceValue(
  game: Pick<Game, "prices">,
  entry: OwnedEntry,
): number | null {
  const unit = referenceUnitValue(game, entry);
  return unit === null ? null : unit * entry.quantity;
}
