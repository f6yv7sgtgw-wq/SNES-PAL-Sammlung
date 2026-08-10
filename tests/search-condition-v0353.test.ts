import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateKleinanzeigenListing,
  type ParserListing,
  type SearchGame,
} from "../app/search-evaluation.ts";

const asterix: SearchGame = {
  id: "asterix",
  title: "Asterix",
  prices: {
    module: 1004,
    manual: 883,
    box: 2805,
    cib: 3532,
    new: 23058,
  },
};

function evaluate(
  title: string,
  description = "Versand möglich.",
  extra: Partial<ParserListing> = {},
) {
  return evaluateKleinanzeigenListing(
    {
      id: title,
      title,
      description,
      url: "https://www.kleinanzeigen.de/s-anzeige/example/asterix-condition-test",
      price: 25,
      source: "kleinanzeigen",
      ...extra,
    },
    asterix,
    [asterix],
    new Set<string>(),
    new Date("2026-08-10T09:52:00Z"),
  );
}

function evaluatedOffer(
  title: string,
  description = "Versand möglich.",
  extra: Partial<ParserListing> = {},
) {
  const result = evaluate(title, description, extra);
  assert.equal(result.kind, "offer");
  return result.offer;
}

test("screenshot regression: a pure Asterix Spielanleitung is discarded", () => {
  const result = evaluate("Asterix - Spielanleitung - Super Nintendo SNES");
  assert.deepEqual(result, { kind: "ignored", reason: "irrelevant" });
});

test("manual-only wording such as Anleitung fuer das Spiel is discarded", () => {
  const result = evaluate("Asterix Anleitung für das Spiel Super Nintendo SNES");
  assert.deepEqual(result, { kind: "ignored", reason: "irrelevant" });
});

test("parser manual metadata cannot turn an accessory-only listing into a game offer", () => {
  const result = evaluate("Asterix Super Nintendo SNES", "Originale Anleitung, kein Modul dabei.", {
    result_info: { condition: "manual" },
  });
  assert.deepEqual(result, { kind: "ignored", reason: "irrelevant" });
});

test("empty box and packaging-only offers are discarded", () => {
  const emptyBox = evaluate("Asterix SNES Leerbox OVP ohne Spiel");
  const boxOnly = evaluate("Asterix SNES nur OVP / Box");
  assert.deepEqual(emptyBox, { kind: "ignored", reason: "irrelevant" });
  assert.deepEqual(boxOnly, { kind: "ignored", reason: "irrelevant" });
});

test("module plus manual requires a real module or game-item signal", () => {
  const offer = evaluatedOffer("Asterix SNES PAL Modul mit Anleitung");
  assert.equal(offer.condition, "module_manual");
  assert.equal(offer.conditionLabel, "Modul + Anleitung");
  assert.equal(offer.conditionCertain, true);
  assert.equal(offer.referenceCents, 1887);
});

test("game plus OVP and manual is CIB and uses the dedicated CIB guide", () => {
  const offer = evaluatedOffer("Asterix mit OVP und Anleitung Super Nintendo SNES Spiel");
  assert.equal(offer.condition, "cib");
  assert.equal(offer.conditionLabel, "OVP / CIB");
  assert.equal(offer.referenceCents, 3532);
});

test("module plus box requires a game-item signal", () => {
  const certain = evaluatedOffer("Asterix SNES Spiel OVP ohne Anleitung");
  assert.equal(certain.condition, "module_box");
  assert.equal(certain.referenceCents, 3809);

  const ambiguous = evaluatedOffer("Asterix SNES OVP ohne Anleitung");
  assert.equal(ambiguous.condition, "module");
  assert.equal(ambiguous.conditionLabel, "Unklar · Modul-Richtwert");
  assert.equal(ambiguous.conditionCertain, false);
  assert.equal(ambiguous.referenceCents, 1004);
});

test("unclear listings still compare conservatively with the module guide", () => {
  const offer = evaluatedOffer("Asterix - Super Nintendo / SNES");
  assert.equal(offer.condition, "module");
  assert.equal(offer.conditionLabel, "Unklar · Modul-Richtwert");
  assert.equal(offer.referenceCents, 1004);
});

test("sealed and explicit CIB signals remain authoritative", () => {
  const sealed = evaluatedOffer("Asterix SNES sealed versiegelt");
  assert.equal(sealed.condition, "new");
  assert.equal(sealed.referenceCents, 23058);

  const cib = evaluatedOffer("Asterix SNES CIB komplett");
  assert.equal(cib.condition, "cib");
  assert.equal(cib.referenceCents, 3532);
});
