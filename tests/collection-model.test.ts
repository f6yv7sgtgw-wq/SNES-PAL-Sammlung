import assert from "node:assert/strict";
import test from "node:test";

import {
  componentsFromLegacyCondition,
  mergeCollectionStates,
  ownershipLabel,
  referencePriceKeys,
  referenceUnitValue,
  referenceValue,
  sanitizeState,
  type Game,
  type OwnedEntry,
} from "../app/collection-model.ts";
import {
  INITIAL_COLLECTION_SOURCE,
  INITIAL_COLLECTION_STATE,
} from "../app/initial-collection.ts";

const game: Game = {
  id: "test",
  title: "Test",
  developer: "Test",
  publisher: "Test",
  year: 1994,
  rarity: 1,
  prices: {
    module: 1000,
    box: 700,
    manual: 300,
    cib: 1800,
    new: 3000,
  },
  cover: null,
  sourcePage: 1,
};

function entry(overrides: Partial<OwnedEntry> = {}): OwnedEntry {
  return {
    components: { module: true, box: false, manual: false },
    completeInBox: false,
    sealed: false,
    quantity: 1,
    purchasePrice: null,
    purchaseDate: "",
    notes: "",
    addedAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z",
    ...overrides,
  };
}

test("CIB uses the CIB market value instead of summing components", () => {
  const owned = entry({
    components: { module: true, box: true, manual: true },
    completeInBox: true,
  });
  assert.equal(referenceUnitValue(game, owned), 1800);
  assert.deepEqual(referencePriceKeys(owned), ["cib"]);
  assert.equal(ownershipLabel(owned), "CIB");
});

test("module plus manual sums both individual guide values", () => {
  const owned = entry({
    components: { module: true, box: false, manual: true },
  });
  assert.equal(referenceUnitValue(game, owned), 1300);
  assert.deepEqual(referencePriceKeys(owned), ["module", "manual"]);
  assert.equal(ownershipLabel(owned), "Modul + Anleitung");
});

test("complete components without CIB status use component sum", () => {
  const owned = entry({
    components: { module: true, box: true, manual: true },
    completeInBox: false,
  });
  assert.equal(referenceUnitValue(game, owned), 2000);
  assert.equal(ownershipLabel(owned), "Modul + Box + Anleitung");
});

test("quantity multiplies the collection reference value", () => {
  const owned = entry({
    components: { module: true, box: false, manual: false },
    quantity: 2,
  });
  assert.equal(referenceValue(game, owned), 2000);
});

test("legacy v1 condition migrates to component model", () => {
  assert.deepEqual(componentsFromLegacyCondition("manual"), {
    components: { module: false, box: false, manual: true },
    completeInBox: false,
    sealed: false,
  });
  const migrated = sanitizeState(
    {
      version: 1,
      owned: {
        test: {
          condition: "cib",
          purchasePrice: 2500,
          purchaseDate: "",
          notes: "Altbestand",
          addedAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      },
    },
    new Set(["test"]),
  );
  assert.equal(migrated.version, 2);
  assert.equal(migrated.owned.test.completeInBox, true);
  assert.deepEqual(migrated.owned.test.components, {
    module: true,
    box: true,
    manual: true,
  });
});

test("initial Excel collection is embedded losslessly for supported catalog games", () => {
  assert.equal(Object.keys(INITIAL_COLLECTION_STATE.owned).length, 118);
  assert.equal(INITIAL_COLLECTION_SOURCE.importedGames, 118);
  assert.deepEqual(INITIAL_COLLECTION_SOURCE.unmatched, ["Super Game Boy"]);

  const purchaseTotal = Object.values(INITIAL_COLLECTION_STATE.owned).reduce(
    (sum, owned) => sum + (owned.purchasePrice ?? 0),
    0,
  );
  const copies = Object.values(INITIAL_COLLECTION_STATE.owned).reduce(
    (sum, owned) => sum + owned.quantity,
    0,
  );
  const manuals = Object.values(INITIAL_COLLECTION_STATE.owned).filter(
    (owned) => owned.components.manual,
  ).length;
  const cib = Object.values(INITIAL_COLLECTION_STATE.owned).filter(
    (owned) => owned.completeInBox,
  ).length;

  assert.equal(purchaseTotal, 204200);
  assert.equal(copies, 120);
  assert.equal(manuals, 17);
  assert.equal(cib, 12);

  const zelda = INITIAL_COLLECTION_STATE.owned["snes-0526-zelda-link-to-the-past"];
  assert.equal(zelda.purchasePrice, 7500);
  assert.equal(zelda.completeInBox, true);

  const marioPaint = INITIAL_COLLECTION_STATE.owned["snes-0219-mario-paint"];
  assert.deepEqual(marioPaint.components, {
    module: true,
    box: false,
    manual: true,
  });
  assert.equal(marioPaint.notes, "Anleitung, Maus, Mauspad");

  const pilotwings = INITIAL_COLLECTION_STATE.owned["snes-0284-pilotwings"];
  assert.deepEqual(pilotwings.components, {
    module: true,
    box: true,
    manual: false,
  });
});

test("one-time migration can seed Excel baseline while preserving existing entries", () => {
  const overlay = sanitizeState(
    {
      version: 2,
      owned: {
        "snes-0526-zelda-link-to-the-past": {
          ...INITIAL_COLLECTION_STATE.owned["snes-0526-zelda-link-to-the-past"],
          purchasePrice: 7000,
          notes: "Eigene Änderung",
        },
      },
    },
    new Set(Object.keys(INITIAL_COLLECTION_STATE.owned)),
  );
  const merged = mergeCollectionStates(INITIAL_COLLECTION_STATE, overlay);
  assert.equal(Object.keys(merged.owned).length, 118);
  assert.equal(
    merged.owned["snes-0526-zelda-link-to-the-past"].purchasePrice,
    7000,
  );
  assert.equal(
    merged.owned["snes-0526-zelda-link-to-the-past"].notes,
    "Eigene Änderung",
  );
});
