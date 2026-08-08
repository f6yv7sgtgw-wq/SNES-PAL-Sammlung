import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  evaluateKleinanzeigenListing,
  type SearchGame,
} from "../app/search-evaluation.ts";

const superMetroid: SearchGame = {
  id: "super-metroid",
  title: "Super Metroid",
  prices: { module: 6300, cib: 25300, new: 40000, box: 9000, manual: 4000 },
};

const zelda: SearchGame = {
  id: "zelda",
  title: "The Legend of Zelda: A Link to the Past",
  prices: { module: 10000, cib: 24000, new: 50000, box: 8000, manual: 3500 },
};

const games = [superMetroid, zelda];
const owned = new Set<string>();
const catalog = JSON.parse(
  readFileSync(new URL("../app/snes-games.json", import.meta.url), "utf8"),
) as { games: SearchGame[] };

function offer(price: number, description: string) {
  const result = evaluateKleinanzeigenListing(
    {
      id: `offer-${price}`,
      title: "Super Metroid SNES PAL Modul",
      url: "https://www.kleinanzeigen.de/s-anzeige/example/123",
      price,
      description,
      source: "kleinanzeigen",
    },
    superMetroid,
    games,
    owned,
    new Date("2026-08-08T18:00:00Z"),
  );
  assert.equal(result.kind, "offer");
  return result.offer;
}

test("marks a shipped offer at least ten euros below reference green", () => {
  const result = offer(50, "Originales Modul. Versand inklusive.");
  assert.equal(result.totalCents, 5000);
  assert.equal(result.referenceCents, 6300);
  assert.equal(result.color, "green");
});

test("uses the ten euro upper boundary for yellow and red", () => {
  assert.equal(offer(65, "Originales Modul. Versand inklusive.").color, "yellow");
  assert.equal(offer(75, "Originales Modul. Versand inklusive.").color, "red");
});

test("never marks unknown shipping green", () => {
  const result = offer(20, "Originales PAL Modul in gutem Zustand.");
  assert.equal(result.shippingStatus, "unknown");
  assert.equal(result.color, "yellow");
});

test("rejects reproductions regardless of price", () => {
  const result = offer(20, "Repro Modul. Versand inklusive.");
  assert.equal(result.color, "red");
  assert.match(result.reason, /Repro/i);
});

test("removes pickup-only listings from a nationwide shipping search", () => {
  const result = evaluateKleinanzeigenListing(
    {
      id: "pickup",
      title: "Super Metroid SNES PAL Modul",
      url: "https://www.kleinanzeigen.de/s-anzeige/example/124",
      price: 20,
      description: "Nur Abholung, kein Versand.",
      source: "kleinanzeigen",
    },
    superMetroid,
    games,
    owned,
  );
  assert.deepEqual(result, { kind: "ignored", reason: "pickup-only" });
});

test("adds recognized bundle values before applying the traffic light", () => {
  const result = evaluateKleinanzeigenListing(
    {
      id: "bundle",
      title: "SNES Konvolut: Super Metroid + Zelda A Link to the Past",
      url: "https://www.kleinanzeigen.de/s-anzeige/example/125",
      price: 100,
      description: "Zwei originale Module, Versand inklusive.",
      source: "kleinanzeigen",
      offer_type: "Bundle/Sammlung",
    },
    zelda,
    games,
    owned,
  );
  assert.equal(result.kind, "offer");
  assert.equal(result.offer.isBundle, true);
  assert.deepEqual(new Set(result.offer.matchedGameIds), new Set(["super-metroid", "zelda"]));
  assert.equal(result.offer.referenceCents, 16300);
  assert.equal(result.offer.color, "green");
});

test("does not turn platform wording into a false bundle match", () => {
  const superGoal: SearchGame = {
    id: "super-goal",
    title: "Super Goal",
    prices: { module: 1500, cib: 5000, new: 9000, box: 2000, manual: 1000 },
  };
  const primeGoal: SearchGame = {
    id: "prime-goal",
    title: "90 Minutes European Prime Goal",
    prices: { module: 2100, cib: 9000, new: 20000, box: 3000, manual: 1200 },
  };
  const result = evaluateKleinanzeigenListing(
    {
      id: "prime-goal-offer",
      title: "90 Minutes European Prime Goal Super Nintendo SNES PAL",
      url: "https://www.kleinanzeigen.de/s-anzeige/example/126",
      price: 39,
      description: "Originales Modul, Versand inklusive.",
      source: "kleinanzeigen",
    },
    primeGoal,
    [primeGoal, superGoal],
    owned,
  );
  assert.equal(result.kind, "offer");
  assert.deepEqual(result.offer.matchedGameIds, ["prime-goal"]);
  assert.equal(result.offer.isBundle, false);
});

test("does not count a base game when only its sequel is offered", () => {
  const aero: SearchGame = {
    id: "aero",
    title: "Aero the Acro-Bat",
    prices: { module: 2500, cib: 9000, new: 18000, box: 3000, manual: 1200 },
  };
  const aero2: SearchGame = {
    id: "aero-2",
    title: "Aero the Acro-Bat 2",
    prices: { module: 17700, cib: 102700, new: 150000, box: 22000, manual: 9000 },
  };
  const result = evaluateKleinanzeigenListing(
    {
      id: "aero-2-offer",
      title: "Aero the Acro-Bat 2 SNES PAL Modul",
      url: "https://www.kleinanzeigen.de/s-anzeige/example/127",
      price: 150,
      description: "Originales Modul, Versand inklusive.",
      source: "kleinanzeigen",
    },
    aero2,
    [aero, aero2],
    owned,
  );
  assert.equal(result.kind, "offer");
  assert.deepEqual(result.offer.matchedGameIds, ["aero-2"]);
  assert.equal(result.offer.isBundle, false);
});

test("keeps separate occurrences of a base game and sequel in a real bundle", () => {
  const finalFight: SearchGame = {
    id: "final-fight",
    title: "Final Fight",
    prices: { module: 3000, cib: 9000, new: 18000, box: 3000, manual: 1200 },
  };
  const finalFight2: SearchGame = {
    id: "final-fight-2",
    title: "Final Fight 2",
    prices: { module: 5000, cib: 14000, new: 25000, box: 5000, manual: 1800 },
  };
  const result = evaluateKleinanzeigenListing(
    {
      id: "final-fight-bundle",
      title: "SNES Bundle: Final Fight + Final Fight 2",
      url: "https://www.kleinanzeigen.de/s-anzeige/example/128",
      price: 50,
      description: "Zwei originale Module, Versand inklusive.",
      source: "kleinanzeigen",
    },
    finalFight2,
    [finalFight, finalFight2],
    owned,
  );
  assert.equal(result.kind, "offer");
  assert.deepEqual(new Set(result.offer.matchedGameIds), new Set(["final-fight", "final-fight-2"]));
  assert.equal(result.offer.referenceCents, 8000);
  assert.equal(result.offer.color, "green");
});

test("keeps a bundle yellow when fewer games are recognized than advertised", () => {
  const result = evaluateKleinanzeigenListing(
    {
      id: "incomplete-bundle",
      title: "SNES Konvolut mit 5 Spielen: Super Metroid + Zelda A Link to the Past",
      url: "https://www.kleinanzeigen.de/s-anzeige/example/129",
      price: 20,
      description: "Fünf originale Module, Versand inklusive.",
      source: "kleinanzeigen",
    },
    zelda,
    games,
    owned,
  );
  assert.equal(result.kind, "offer");
  assert.equal(result.offer.bundleCertain, false);
  assert.equal(result.offer.color, "yellow");
});

test("every exact catalog title remains a single-game offer", () => {
  const collisions: Array<{ title: string; matched: string[] }> = [];
  for (const game of catalog.games) {
    const result = evaluateKleinanzeigenListing(
      {
        id: `catalog-${game.id}`,
        title: `${game.title} SNES PAL Modul`,
        url: `https://www.kleinanzeigen.de/s-anzeige/example/${game.id}`,
        price: 20,
        description: "Originales Modul. Versand inklusive.",
        source: "kleinanzeigen",
      },
      game,
      catalog.games,
      owned,
    );
    if (
      result.kind !== "offer" ||
      result.offer.isBundle ||
      result.offer.matchedGameIds.length !== 1 ||
      result.offer.matchedGameIds[0] !== game.id
    ) {
      collisions.push({
        title: game.title,
        matched: result.kind === "offer" ? result.offer.matchedGameIds : [],
      });
    }
  }
  assert.deepEqual(collisions, []);
});
