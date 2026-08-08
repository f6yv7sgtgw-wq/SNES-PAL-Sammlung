const DATABASE_NAME = "snes-pal-sammlung-search";
const DATABASE_VERSION = 1;
const STATE_STORE = "state";
const OFFER_STORE = "offers";
const ACTIVE_STATE_KEY = "active";

export const LEGACY_SEARCH_STORAGE_KEY = "snes-pal-kleinanzeigen-search-v03-2";

export type StoredSearchSnapshot = {
  state: Record<string, unknown>;
  offers: Record<string, unknown>;
};

export type BrowserStorageEstimate = {
  usage: number | null;
  quota: number | null;
};

function requestValue<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error || new Error("Der lokale Suchspeicher ist nicht verfügbar.")),
      { once: true },
    );
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error || new Error("Der lokale Suchspeicher wurde abgebrochen.")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error || new Error("Der lokale Suchspeicher ist fehlgeschlagen.")),
      { once: true },
    );
  });
}

function openSearchDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB wird von diesem Browser nicht bereitgestellt."));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STATE_STORE)) {
        database.createObjectStore(STATE_STORE);
      }
      if (!database.objectStoreNames.contains(OFFER_STORE)) {
        database.createObjectStore(OFFER_STORE, { keyPath: "id" });
      }
    });
    request.addEventListener(
      "error",
      () => reject(request.error || new Error("IndexedDB konnte nicht geöffnet werden.")),
      { once: true },
    );
    request.addEventListener(
      "blocked",
      () => reject(new Error("Der Suchspeicher wird noch von einer älteren Seite blockiert.")),
      { once: true },
    );
    request.addEventListener(
      "success",
      () => {
        const database = request.result;
        database.addEventListener("versionchange", () => database.close());
        resolve(database);
      },
      { once: true },
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function loadStoredSearch(): Promise<StoredSearchSnapshot | null> {
  const database = await openSearchDatabase();
  try {
    const transaction = database.transaction([STATE_STORE, OFFER_STORE], "readonly");
    const done = transactionDone(transaction);
    const [state, storedOffers] = await Promise.all([
      requestValue(transaction.objectStore(STATE_STORE).get(ACTIVE_STATE_KEY)),
      requestValue(transaction.objectStore(OFFER_STORE).getAll()),
    ]);
    await done;
    if (!isRecord(state)) return null;

    const offers: Record<string, unknown> = {};
    for (const offer of storedOffers as unknown[]) {
      if (isRecord(offer) && typeof offer.id === "string") offers[offer.id] = offer;
    }
    return { state, offers };
  } finally {
    database.close();
  }
}

export async function saveStoredSearch(
  state: Record<string, unknown>,
  changedOffers: Array<Record<string, unknown>>,
) {
  const database = await openSearchDatabase();
  try {
    const transaction = database.transaction([STATE_STORE, OFFER_STORE], "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(STATE_STORE).put(state, ACTIVE_STATE_KEY);
    const offerStore = transaction.objectStore(OFFER_STORE);
    for (const offer of changedOffers) offerStore.put(offer);
    await done;
  } finally {
    database.close();
  }
}

export async function replaceStoredSearch(
  state: Record<string, unknown>,
  offers: Array<Record<string, unknown>>,
) {
  const database = await openSearchDatabase();
  try {
    const transaction = database.transaction([STATE_STORE, OFFER_STORE], "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(STATE_STORE).put(state, ACTIVE_STATE_KEY);
    const offerStore = transaction.objectStore(OFFER_STORE);
    offerStore.clear();
    for (const offer of offers) offerStore.put(offer);
    await done;
  } finally {
    database.close();
  }
}

export async function clearStoredSearch() {
  const database = await openSearchDatabase();
  try {
    const transaction = database.transaction([STATE_STORE, OFFER_STORE], "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(STATE_STORE).clear();
    transaction.objectStore(OFFER_STORE).clear();
    await done;
  } finally {
    database.close();
  }
}

export async function estimateBrowserStorage(): Promise<BrowserStorageEstimate> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usage: null, quota: null };
  }
  const estimate = await navigator.storage.estimate();
  return {
    usage: typeof estimate.usage === "number" ? estimate.usage : null,
    quota: typeof estimate.quota === "number" ? estimate.quota : null,
  };
}

export function formatStorageBytes(bytes: number | null) {
  if (bytes === null || !Number.isFinite(bytes)) return "–";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })} MB`;
}
