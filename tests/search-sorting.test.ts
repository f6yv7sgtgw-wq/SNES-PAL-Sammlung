import assert from "node:assert/strict";
import test from "node:test";

import type { EvaluatedOffer, OfferColor } from "../app/search-evaluation.ts";
import { sortOffersInColorGroups } from "../app/search-sort.ts";

function offer(
  id: string,
  color: OfferColor,
  values: Partial<EvaluatedOffer> = {},
): EvaluatedOffer {
  return {
    id,
    listingId: id,
    source: "kleinanzeigen",
    title: id,
    url: `https://www.kleinanzeigen.de/s-anzeige/${id}`,
    imageUrl: null,
    description: "",
    priceRaw: null,
    priceCents: 3000,
    shippingCents: 500,
    totalCents: 3500,
    comparisonCents: 3500,
    comparisonIncludesShipping: true,
    shippingStatus: "confirmed",
    shippingLabel: "Versand 5 €",
    condition: "module",
    conditionLabel: "Modul",
    conditionCertain: true,
    referenceCents: 5000,
    differenceCents: 1500,
    deviationPercent: -30,
    color,
    reason: "30 % unter dem Richtwert",
    unsuitableReason: null,
    isBundle: false,
    bundleCertain: true,
    matchCertain: true,
    matchedGameIds: [id],
    missingGameIds: [id],
    ownedGameIds: [],
    discoveredForGameIds: [id],
    place: null,
    postedAt: null,
    checkedAt: "2026-08-09T00:00:00.000Z",
    ...values,
  };
}

test("keeps the traffic-light groups fixed for every sort direction", () => {
  const mixed = [
    offer("rot", "red", { priceCents: 1 }),
    offer("unklar", "unknown", { priceCents: 1 }),
    offer("gelb", "yellow", { priceCents: 999_999 }),
    offer("gruen", "green", { priceCents: 999_999 }),
    offer("orange", "orange", { priceCents: 1 }),
  ];

  assert.deepEqual(
    sortOffersInColorGroups(mixed, "offer", "desc").map(({ color }) => color),
    ["green", "yellow", "orange", "red", "unknown"],
  );
});

test("sorts offer prices only inside their color group", () => {
  const rows = [
    offer("gruen-teuer", "green", { priceCents: 4000 }),
    offer("gelb-billig", "yellow", { priceCents: 1000 }),
    offer("gruen-billig", "green", { priceCents: 2000 }),
  ];

  assert.deepEqual(
    sortOffersInColorGroups(rows, "offer", "asc").map(({ id }) => id),
    ["gruen-billig", "gruen-teuer", "gelb-billig"],
  );
});

test("sorts euro differences like the signed value shown in the card", () => {
  const rows = [
    offer("20-euro-guenstiger", "green", { differenceCents: 2000 }),
    offer("5-euro-guenstiger", "green", { differenceCents: 500 }),
    offer("3-euro-teurer", "green", { differenceCents: -300 }),
  ];

  assert.deepEqual(
    sortOffersInColorGroups(rows, "difference", "asc").map(({ id }) => id),
    ["20-euro-guenstiger", "5-euro-guenstiger", "3-euro-teurer"],
  );
});

test("sorts reference, percentage and title in both directions", () => {
  const rows = [
    offer("Zelda", "green", { referenceCents: 9000, deviationPercent: -15 }),
    offer("ActRaiser", "green", { referenceCents: 3000, deviationPercent: -40 }),
  ];

  assert.deepEqual(
    sortOffersInColorGroups(rows, "reference", "desc").map(({ id }) => id),
    ["Zelda", "ActRaiser"],
  );
  assert.deepEqual(
    sortOffersInColorGroups(rows, "deviation", "asc").map(({ id }) => id),
    ["ActRaiser", "Zelda"],
  );
  assert.deepEqual(
    sortOffersInColorGroups(rows, "title", "asc").map(({ id }) => id),
    ["ActRaiser", "Zelda"],
  );
});

test("keeps unavailable values at the end in either direction", () => {
  const rows = [
    offer("ohne-wert", "unknown", { referenceCents: null }),
    offer("mit-wert", "unknown", { referenceCents: 5000 }),
  ];

  assert.deepEqual(
    sortOffersInColorGroups(rows, "reference", "asc").map(({ id }) => id),
    ["mit-wert", "ohne-wert"],
  );
  assert.deepEqual(
    sortOffersInColorGroups(rows, "reference", "desc").map(({ id }) => id),
    ["mit-wert", "ohne-wert"],
  );
});
