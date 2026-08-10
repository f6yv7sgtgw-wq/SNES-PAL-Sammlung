import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateKleinanzeigenListing,
  type SearchGame,
} from "../app/search-evaluation.ts";

const game: SearchGame = {
  id: "super-metroid",
  title: "Super Metroid",
  prices: {
    module: 6300,
    manual: 4000,
    box: 9000,
    cib: 25300,
    new: 40000,
  },
};

function evaluate(title: string, description = "Versand inklusive.") {
  const result = evaluateKleinanzeigenListing(
    {
      id: title,
      title,
      description,
      url: "https://www.kleinanzeigen.de/s-anzeige/example/condition-test",
      price: 50,
      source: "kleinanzeigen",
    },
    game,
    [game],
    new Set<string>(),
    new Date("2026-08-10T09:00:00Z"),
  );
  assert.equal(result.kind, "offer");
  return result.offer;
}

test("module offer uses only the module guide value", () => {
  const offer = evaluate("Super Metroid SNES PAL Modul");
  assert.equal(offer.condition, "module");
  assert.equal(offer.conditionLabel, "Modul");
  assert.equal(offer.conditionCertain, true);
  assert.equal(offer.referenceCents, 6300);
});

test("module plus manual uses module plus manual guide values", () => {
  const offer = evaluate("Super Metroid SNES PAL Modul mit Anleitung");
  assert.equal(offer.condition, "module_manual");
  assert.equal(offer.conditionLabel, "Modul + Anleitung");
  assert.equal(offer.referenceCents, 10300);
});

test("module plus box uses module plus box guide values", () => {
  const offer = evaluate("Super Metroid SNES PAL Modul mit OVP ohne Anleitung");
  assert.equal(offer.condition, "module_box");
  assert.equal(offer.conditionLabel, "Modul + Box");
  assert.equal(offer.referenceCents, 15300);
});

test("CIB offer uses the dedicated CIB guide value", () => {
  const offer = evaluate("Super Metroid SNES PAL CIB komplett mit OVP und Anleitung");
  assert.equal(offer.condition, "cib");
  assert.equal(offer.conditionLabel, "OVP / CIB");
  assert.equal(offer.referenceCents, 25300);
});

test("sealed offer uses the sealed/new guide value", () => {
  const offer = evaluate("Super Metroid SNES PAL sealed versiegelt");
  assert.equal(offer.condition, "new");
  assert.equal(offer.conditionLabel, "Neu / Sealed");
  assert.equal(offer.referenceCents, 40000);
});

test("unclear condition including OVP-only wording falls back to module guide", () => {
  const offer = evaluate("Super Metroid SNES PAL OVP Spiel");
  assert.equal(offer.condition, "module");
  assert.equal(offer.conditionLabel, "Unklar · Modul-Richtwert");
  assert.equal(offer.conditionCertain, false);
  assert.equal(offer.referenceCents, 6300);
  assert.match(offer.reason, /Zustand unklar · Modul-Richtwert verwendet/);
});
