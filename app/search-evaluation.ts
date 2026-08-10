export type SearchPriceKey = "module" | "cib" | "new" | "box" | "manual";
export type OfferConditionKey =
  | "module"
  | "module_manual"
  | "module_box"
  | "cib"
  | "new";

export type SearchGame = {
  id: string;
  title: string;
  prices: Record<SearchPriceKey, number | null>;
};

export type ParserListing = {
  id?: string | number;
  title?: string;
  url?: string;
  image_url?: string | null;
  price?: number | null;
  price_raw?: string | null;
  description?: string | null;
  postal_code?: string | null;
  place?: string | null;
  posted_at?: string | null;
  source?: string | null;
  source_label?: string | null;
  offer_type?: string | null;
  result_info?: {
    offer_type?: string | null;
    condition?: string | null;
    scope?: string | null;
  } | null;
};

export type OfferColor = "green" | "yellow" | "orange" | "red" | "unknown";
export type ShippingStatus = "confirmed" | "unknown" | "pickup-only";

export type EvaluatedOffer = {
  id: string;
  listingId: string;
  source: "kleinanzeigen";
  title: string;
  url: string;
  imageUrl: string | null;
  description: string;
  priceRaw: string | null;
  priceCents: number | null;
  shippingCents: number | null;
  totalCents: number | null;
  comparisonCents: number | null;
  comparisonIncludesShipping: boolean;
  shippingStatus: ShippingStatus;
  shippingLabel: string;
  condition: OfferConditionKey;
  conditionLabel: string;
  conditionCertain: boolean;
  referenceCents: number | null;
  differenceCents: number | null;
  deviationPercent: number | null;
  color: OfferColor;
  reason: string;
  unsuitableReason: string | null;
  isBundle: boolean;
  bundleCertain: boolean;
  matchCertain: boolean;
  matchedGameIds: string[];
  missingGameIds: string[];
  ownedGameIds: string[];
  discoveredForGameIds: string[];
  place: string | null;
  postedAt: string | null;
  checkedAt: string;
};

export type EvaluationResult =
  | { kind: "offer"; offer: EvaluatedOffer }
  | { kind: "ignored"; reason: "not-kleinanzeigen" | "irrelevant" | "pickup-only" };

const WORD_STOP = new Set([
  "a",
  "an",
  "and",
  "das",
  "der",
  "die",
  "ein",
  "eine",
  "for",
  "für",
  "in",
  "of",
  "on",
  "nintendo",
  "snes",
  "super",
  "the",
  "to",
  "und",
  "von",
]);

const HARD_REJECT =
  /\b(repro(?:duction)?|nachbau|bootleg|fake|romhack|rom[ -]?hack|defekt|kaputt|bastler|ungetestet|ersatzteil)\b/i;
const WANTED = /^(?:suche|gesucht|ankauf|kaufe)\b|\b(?:suche nach|wer verkauft)\b/i;
const ONLY_ACCESSORY =
  /\b(?:nur|only)\s+(?:ovp|box|karton|verpackung|anleitung|manual|hülle)|\b(?:leerbox|leerverpackung|empty box|box only|ovp only)\b/i;
const PICKUP_ONLY =
  /\b(?:nur|ausschließlich|ausschliesslich)\s+(?:zur\s+)?abholung\b|\bkein(?:e[rs]?)?\s+versand\b|\bnur\s+selbstabholer\b/i;
const SHIPPING_SIGNAL =
  /\b(versand|verschicke|verschicken|porto|büwa|buewa|warensendung|briefversand|dhl|hermes|gls|dpd)\b/i;
const SHIPPING_INCLUDED =
  /\b(?:inkl\.?|inklusive|einschließlich|einschliesslich)\s+(?:des\s+)?(?:versand(?:s)?|porto)\b|\bversand(?:skosten)?\s+(?:inkl\.?|inklusive|enthalten)\b/i;
const BUNDLE_SIGNAL =
  /\b(konvolut|sammlung|spielesammlung|bundle|alles zusammen|mehrere spiele|folgende spiele|\d+\s+(?:snes\s+)?spiel(?:e|en)|\d+\s+module)\b|\s\+\s/i;

type ExactTitleOccurrence = {
  game: SearchGame;
  start: number;
  end: number;
};

const ROMAN_NUMERALS: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
  ix: "9",
  x: "10",
};

export function buildParserQuery(title: string) {
  const safeTitle = title
    .normalize("NFKC")
    .replace(/[\/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `SNES ${safeTitle}`.slice(0, 120);
}

export function normalizeListingText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(value: string) {
  return normalizeListingText(value)
    .split(" ")
    .map((token) => ROMAN_NUMERALS[token] ?? token)
    .filter((token) => token.length > 1 && !WORD_STOP.has(token));
}

function exactOccurrences(normalizedText: string, game: SearchGame) {
  const normalizedTitle = normalizeListingText(game.title);
  if (!normalizedText || !normalizedTitle) return [] as ExactTitleOccurrence[];
  const paddedText = ` ${normalizedText} `;
  const needle = ` ${normalizedTitle} `;
  const occurrences: ExactTitleOccurrence[] = [];
  let from = 0;
  while (from < paddedText.length) {
    const index = paddedText.indexOf(needle, from);
    if (index < 0) break;
    occurrences.push({
      game,
      start: index + 1,
      end: index + needle.length - 1,
    });
    from = index + 1;
  }
  return occurrences;
}

function resolveExactGames(text: string, games: SearchGame[]) {
  const normalizedText = normalizeListingText(text);
  const candidates = games.flatMap((game) => exactOccurrences(normalizedText, game));
  candidates.sort(
    (left, right) =>
      right.end - right.start - (left.end - left.start) ||
      left.start - right.start,
  );

  const selected: ExactTitleOccurrence[] = [];
  for (const candidate of candidates) {
    const overlaps = selected.some(
      (other) => candidate.start < other.end && other.start < candidate.end,
    );
    if (!overlaps) selected.push(candidate);
  }

  return {
    candidates,
    gameIds: new Set(selected.map(({ game }) => game.id)),
  };
}

function fuzzyCurrentMatch(text: string, game: SearchGame) {
  const wanted = titleTokens(game.title);
  if (!wanted.length) return { matched: false, certain: false };
  const available = new Set(titleTokens(text));
  const matchedCount = wanted.filter((token) => available.has(token)).length;
  if (wanted.length === 1) {
    const matched = available.has(wanted[0]);
    return { matched, certain: false };
  }
  const ratio = matchedCount / wanted.length;
  const matched = matchedCount >= 2 && ratio >= 0.75;
  return {
    matched,
    certain: matched && (matchedCount >= 3 || ratio === 1),
  };
}

function declaredBundleCount(text: string) {
  const normalized = normalizeListingText(text);
  const digit = normalized.match(
    /\b(\d{1,3})\s+(?:snes\s+)?(?:spiel(?:e|en)|module|cartridges)\b/,
  );
  if (digit) return Number.parseInt(digit[1], 10);
  const words: Record<string, number> = {
    zwei: 2,
    three: 3,
    drei: 3,
    four: 4,
    vier: 4,
    five: 5,
    funf: 5,
    sechs: 6,
    seven: 7,
    sieben: 7,
    eight: 8,
    acht: 8,
    nine: 9,
    neun: 9,
    ten: 10,
    zehn: 10,
  };
  const word = normalized.match(
    /\b(zwei|three|drei|four|vier|five|funf|sechs|seven|sieben|eight|acht|nine|neun|ten|zehn)\s+(?:snes\s+)?(?:spiel(?:e|en)|module|cartridges)\b/,
  );
  return word ? words[word[1]] : null;
}

function contentSignals(text: string) {
  const normalized = normalizeListingText(text);
  const manualSignal = /\b(anleitung|manual|handbuch|spielanleitung)\b/.test(normalized);
  const boxSignal = /\b(ovp|originalverpackung|box|karton|verpackung)\b/.test(normalized);
  const moduleSignal = /\b(modul|module|cartridge|lose|loose)\b/.test(normalized);
  const gameSignal = /\b(spiel|game)\b/.test(normalized);
  const noManual = /\b(ohne anleitung|ohne manual|anleitung fehlt|manual fehlt)\b/.test(normalized);
  const noBox = /\b(ohne ovp|ohne box|ohne verpackung|ovp fehlt|box fehlt)\b/.test(normalized);
  const noGameItem =
    /\b(?:ohne|kein(?:e[rs]?)?|nicht mit|nicht dabei|fehlt)\s+(?:das\s+)?(?:spiel|modul|module|cartridge)\b|\b(?:spiel|modul|module|cartridge)\s+(?:nicht dabei|fehlt|nicht enthalten)\b/.test(
      normalized,
    );
  const explicitManualOnly =
    /\b(?:nur|only)\s+(?:die\s+)?(?:spielanleitung|anleitung|manual|handbuch)\b|\b(?:spielanleitung|anleitung|manual|handbuch)\s+(?:only|einzeln)\b/.test(
      normalized,
    );
  const manualForGame =
    /\b(?:spielanleitung|anleitung|manual|handbuch)\b(?:\s+\w+){0,4}\s+\b(?:fur|fuer|zum|zu|vom|for)\b(?:\s+\w+){0,4}\s+\b(?:spiel|game)\b/.test(
      normalized,
    );
  const explicitBoxOnly =
    /\b(leerbox|leerverpackung|empty box|box only|ovp only)\b|\b(?:nur|only)\s+(?:die\s+)?(?:ovp|box|karton|verpackung)\b/.test(
      normalized,
    );

  return {
    normalized,
    manualSignal,
    boxSignal,
    moduleSignal,
    gameSignal,
    gameItemSignal: (moduleSignal || gameSignal) && !noGameItem,
    noManual,
    noBox,
    noGameItem,
    explicitManualOnly,
    manualForGame,
    explicitBoxOnly,
  };
}

function accessoryOnlyReason(text: string) {
  const signals = contentSignals(text);

  if (signals.explicitBoxOnly || (signals.boxSignal && signals.noGameItem)) {
    return "Nur Verpackung ohne Spiel/Modul";
  }

  if (
    signals.explicitManualOnly ||
    signals.manualForGame ||
    (signals.manualSignal &&
      !signals.boxSignal &&
      !signals.gameItemSignal)
  ) {
    return "Nur Anleitung ohne Spiel/Modul";
  }

  if (
    signals.noGameItem &&
    (signals.manualSignal || signals.boxSignal)
  ) {
    return "Nur Zubehör ohne Spiel/Modul";
  }

  return null;
}

function inferCondition(text: string): {
  key: OfferConditionKey;
  label: string;
  certain: boolean;
} {
  const signals = contentSignals(text);
  const { normalized } = signals;
  const sealed = /\b(versiegelt|sealed|ungeoffnet|neu in folie|noch in folie|factory sealed)\b/.test(
    normalized,
  );
  if (sealed) {
    return { key: "new", label: "Neu / Sealed", certain: true };
  }

  const explicitCib = /\b(cib|complete in box|komplett in ovp|komplett mit ovp|komplett mit box|komplett mit verpackung)\b/.test(
    normalized,
  );

  if (explicitCib) {
    return { key: "cib", label: "OVP / CIB", certain: true };
  }
  if (
    signals.gameItemSignal &&
    signals.boxSignal &&
    signals.manualSignal &&
    !signals.noManual &&
    !signals.noBox &&
    !signals.noGameItem
  ) {
    return { key: "cib", label: "OVP / CIB", certain: true };
  }
  if (
    signals.gameItemSignal &&
    signals.boxSignal &&
    signals.noManual &&
    !signals.noGameItem
  ) {
    return { key: "module_box", label: "Modul + Box", certain: true };
  }
  if (
    signals.moduleSignal &&
    signals.boxSignal &&
    !signals.manualSignal &&
    !signals.noBox &&
    !signals.noGameItem
  ) {
    return { key: "module_box", label: "Modul + Box", certain: true };
  }
  if (
    signals.gameItemSignal &&
    signals.manualSignal &&
    !signals.boxSignal &&
    !signals.noManual &&
    !signals.noGameItem
  ) {
    return { key: "module_manual", label: "Modul + Anleitung", certain: true };
  }
  if (
    signals.moduleSignal &&
    !signals.boxSignal &&
    !signals.manualSignal &&
    !signals.noGameItem
  ) {
    return { key: "module", label: "Modul", certain: true };
  }

  // Conservative fallback: an unclear condition is always compared with the
  // module guide value, never CIB or sealed.
  return {
    key: "module",
    label: "Unklar · Modul-Richtwert",
    certain: false,
  };
}

export function conditionReferenceForGame(
  game: SearchGame,
  condition: OfferConditionKey,
): number | null {
  if (condition === "new") return game.prices.new;
  if (condition === "cib") return game.prices.cib;
  if (condition === "module") return game.prices.module;
  if (condition === "module_manual") {
    if (game.prices.module === null || game.prices.manual === null) return null;
    return game.prices.module + game.prices.manual;
  }
  if (game.prices.module === null || game.prices.box === null) return null;
  return game.prices.module + game.prices.box;
}

function inferShipping(text: string): {
  status: ShippingStatus;
  cents: number | null;
  label: string;
} {
  if (PICKUP_ONLY.test(text)) {
    return { status: "pickup-only", cents: null, label: "Nur Abholung" };
  }
  if (SHIPPING_INCLUDED.test(text)) {
    return { status: "confirmed", cents: 0, label: "Versand inklusive" };
  }
  const amount = text.match(
    /(?:versand(?:skosten)?|porto|büwa|buewa|warensendung|dhl|hermes)(?:\s*(?:beträgt|fuer|für|kostet|:|ab|zzgl\.?|plus))?\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:€|eur)/i,
  );
  if (amount) {
    const value = Number.parseFloat(amount[1].replace(",", "."));
    if (Number.isFinite(value)) {
      return {
        status: "confirmed",
        cents: Math.round(value * 100),
        label: `Versand ${value.toFixed(2).replace(".", ",")} €`,
      };
    }
  }
  if (SHIPPING_SIGNAL.test(text)) {
    return { status: "confirmed", cents: null, label: "Versand möglich · Kosten offen" };
  }
  return { status: "unknown", cents: null, label: "Versand ungeklärt" };
}

function validPriceCents(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function hardRejectReason(text: string) {
  const withoutNegatedDefect = text
    .replace(/\b(?:nicht|kein(?:e[rs]?)?)\s+defekt\b/gi, "")
    .replace(/\bohne\s+defekt\b/gi, "");
  if (WANTED.test(text)) return "Gesuch statt Verkaufsangebot";
  if (ONLY_ACCESSORY.test(text)) return "Nur Verpackung oder Anleitung";
  const found = withoutNegatedDefect.match(HARD_REJECT)?.[1];
  return found ? `Unpassender Hinweis: ${found}` : null;
}

function previousUnsuitableReason(offer: EvaluatedOffer) {
  if (offer.unsuitableReason) return offer.unsuitableReason;
  return /^(?:Gesuch statt Verkaufsangebot|Nur Verpackung oder Anleitung|Unpassender Hinweis:)/i.test(
    offer.reason,
  )
    ? offer.reason
    : null;
}

function priceBand(deviationPercent: number): OfferColor {
  if (deviationPercent <= 10) return "green";
  if (deviationPercent <= 25) return "yellow";
  if (deviationPercent <= 40) return "orange";
  return "red";
}

function deviationReason(deviationPercent: number) {
  if (deviationPercent < 0) {
    return `${Math.abs(deviationPercent)} % unter dem Richtwert`;
  }
  if (deviationPercent > 0) {
    return `+${deviationPercent} % über dem Richtwert`;
  }
  return "Entspricht dem Richtwert";
}

export function reclassifyEvaluatedOffer(offer: EvaluatedOffer): EvaluatedOffer {
  const unsuitableReason = previousUnsuitableReason(offer);
  const comparisonIncludesShipping = offer.totalCents !== null;
  const comparisonCents = offer.totalCents ?? offer.priceCents;
  const canCompare =
    offer.matchCertain &&
    offer.bundleCertain &&
    comparisonCents !== null &&
    comparisonCents > 100 &&
    offer.referenceCents !== null &&
    offer.referenceCents > 0;
  const differenceCents = canCompare
    ? (offer.referenceCents ?? 0) - (comparisonCents ?? 0)
    : null;
  const deviationPercent = canCompare
    ? Math.round(
        (((comparisonCents ?? 0) - (offer.referenceCents ?? 0)) /
          (offer.referenceCents ?? 1)) *
          100,
      )
    : null;

  let color: OfferColor = "unknown";
  let reason = "Preisvergleich nicht eindeutig möglich";
  if (unsuitableReason) {
    color = "red";
    reason = unsuitableReason;
  } else if (!offer.matchCertain) {
    reason = "Zuordnung zum gesuchten Spiel nicht eindeutig";
  } else if (!offer.bundleCertain) {
    reason = "Konvolutinhalt nicht vollständig eindeutig";
  } else if (offer.priceCents !== null && offer.priceCents <= 100) {
    reason = "Preis von 1 € oder weniger ist wahrscheinlich ein Platzhalter";
  } else if (comparisonCents === null) {
    reason = "Angebotspreis fehlt";
  } else if (offer.referenceCents === null || offer.referenceCents <= 0) {
    reason = "Für diesen Zustand ist kein Richtwert verfügbar";
  } else if (deviationPercent !== null) {
    color = priceBand(deviationPercent);
    const notes = [deviationReason(deviationPercent)];
    if (!comparisonIncludesShipping) {
      notes.push("Vergleich vor offenen Versandkosten");
    }
    if (!offer.conditionCertain) {
      notes.push("Zustand unklar · Modul-Richtwert verwendet");
    }
    reason = notes.join(" · ");
  }

  return {
    ...offer,
    color,
    reason,
    unsuitableReason,
    comparisonCents,
    comparisonIncludesShipping,
    differenceCents,
    deviationPercent,
  };
}

export function evaluateKleinanzeigenListing(
  listing: ParserListing,
  currentGame: SearchGame,
  games: SearchGame[],
  ownedIds: ReadonlySet<string>,
  now = new Date(),
): EvaluationResult {
  const source = String(listing.source || listing.source_label || "").toLocaleLowerCase("de-DE");
  if (source && !source.includes("kleinanzeigen")) {
    return { kind: "ignored", reason: "not-kleinanzeigen" };
  }

  const title = String(listing.title || "").trim();
  const description = String(listing.description || "").trim();
  const text = `${title} ${description}`.trim();
  const parserBundle =
    String(listing.offer_type || "").toLocaleLowerCase("de-DE").includes("bundle") ||
    String(listing.result_info?.scope || "").toLocaleLowerCase("de-DE") === "bundle";
  const exact = resolveExactGames(text, games);
  const currentHadExactCandidate = exact.candidates.some(
    ({ game }) => game.id === currentGame.id,
  );
  const currentExact = exact.gameIds.has(currentGame.id);
  const fuzzyCurrent =
    currentExact || currentHadExactCandidate
      ? { matched: false, certain: false }
      : fuzzyCurrentMatch(text, currentGame);
  const currentMatched = currentExact || fuzzyCurrent.matched;
  const matchedGameIds = new Set(exact.gameIds);
  if (fuzzyCurrent.matched) matchedGameIds.add(currentGame.id);
  let matchedGames = games.filter((game) => matchedGameIds.has(game.id));
  const bundleSignal = parserBundle || BUNDLE_SIGNAL.test(text) || matchedGames.length > 1;

  if (!currentMatched && matchedGames.length) {
    return { kind: "ignored", reason: "irrelevant" };
  }
  if (!currentMatched && !matchedGames.length && !bundleSignal) {
    return { kind: "ignored", reason: "irrelevant" };
  }
  if (!matchedGames.length && bundleSignal) matchedGames = [currentGame];

  const conditionText = `${text} ${String(listing.result_info?.condition || "")}`.trim();
  if (accessoryOnlyReason(conditionText)) {
    return { kind: "ignored", reason: "irrelevant" };
  }

  const shipping = inferShipping(text);
  if (shipping.status === "pickup-only") {
    return { kind: "ignored", reason: "pickup-only" };
  }

  const condition = inferCondition(conditionText);
  const isBundle = bundleSignal || matchedGames.length > 1;
  const descriptionLooksCut = /(?:\.\.\.|…)$/.test(description);
  const declaredCount = declaredBundleCount(text);
  const allNamedMatchesCertain =
    currentExact || (!currentHadExactCandidate && fuzzyCurrent.certain);
  const matchCertain = currentMatched && allNamedMatchesCertain;
  const bundleCertain =
    !isBundle ||
    (matchCertain &&
      matchedGames.length > 1 &&
      !descriptionLooksCut &&
      (declaredCount === null || matchedGames.length >= declaredCount));
  const references = matchedGames.map((game) =>
    conditionReferenceForGame(game, condition.key),
  );
  const referenceCents = references.every((value) => value !== null)
    ? references.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null;
  const priceCents = validPriceCents(listing.price);
  const totalCents =
    priceCents !== null && shipping.cents !== null
      ? priceCents + shipping.cents
      : null;
  const rejected = hardRejectReason(text);

  const resolvedGameIds = matchedGames.map((game) => game.id);
  const listingId = String(listing.id || listing.url || `${currentGame.id}-${title}`);
  return {
    kind: "offer",
    offer: reclassifyEvaluatedOffer({
      id: `kleinanzeigen:${listingId}`,
      listingId,
      source: "kleinanzeigen",
      title: title || "Kleinanzeigen-Angebot",
      url: String(listing.url || ""),
      imageUrl: listing.image_url || null,
      description: description.slice(0, 520),
      priceRaw: listing.price_raw || null,
      priceCents,
      shippingCents: shipping.cents,
      totalCents,
      comparisonCents: null,
      comparisonIncludesShipping: false,
      shippingStatus: shipping.status,
      shippingLabel: shipping.label,
      condition: condition.key,
      conditionLabel: condition.label,
      conditionCertain: condition.certain,
      referenceCents,
      differenceCents: null,
      deviationPercent: null,
      color: "unknown",
      reason: "Preisvergleich wird berechnet",
      unsuitableReason: rejected,
      isBundle,
      bundleCertain,
      matchCertain,
      matchedGameIds: resolvedGameIds,
      missingGameIds: resolvedGameIds.filter((id) => !ownedIds.has(id)),
      ownedGameIds: resolvedGameIds.filter((id) => ownedIds.has(id)),
      discoveredForGameIds: [currentGame.id],
      place: listing.place || listing.postal_code || null,
      postedAt: listing.posted_at || null,
      checkedAt: now.toISOString(),
    }),
  };
}

export function mergeEvaluatedOffers(
  current: EvaluatedOffer | undefined,
  incoming: EvaluatedOffer,
) {
  if (!current) return incoming;
  const preferred =
    incoming.matchedGameIds.length >= current.matchedGameIds.length ? incoming : current;
  return {
    ...preferred,
    discoveredForGameIds: Array.from(
      new Set([...current.discoveredForGameIds, ...incoming.discoveredForGameIds]),
    ),
  };
}
