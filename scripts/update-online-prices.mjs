import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const CATALOG_PATH = new URL("../app/snes-games.json", import.meta.url);
const PRICECHARTING_BASE = "https://www.pricecharting.com";
const PRICECHARTING_INDEX =
  "https://www.pricecharting.com/console/pal-super-nintendo";
const JINA_READER = "https://r.jina.ai/http://www.pricecharting.com";
const ECB_DAILY =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const CACHE_DIR = "/tmp/snes-pal-price-cache";
const USER_AGENT =
  "Mozilla/5.0 (compatible; SNES-PAL-Sammlung/1.0; price-guide-refresh)";
const APPLY = process.argv.includes("--apply");
const DUMP_MATCHES = process.argv.includes("--dump-matches");
const SNAPSHOT_FLAG = process.argv.indexOf("--snapshot");
const SNAPSHOT_PATH =
  SNAPSHOT_FLAG >= 0 ? process.argv[SNAPSHOT_FLAG + 1] : null;

const MANUAL_MATCHES = {
  // PAL catalog names that differ materially between the 2020 guide and
  // PriceCharting.
  "snes-0302-power-ranger-battle-racers":
    "/game/pal-super-nintendo/power-rangers-zeo-battle-racers",
  "snes-0505-winter-olympic-games":
    "/game/pal-super-nintendo/winter-olympics-lillehammer-%2794",
};

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function normalizeTitle(value) {
  return decodeHtml(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\bthe\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/\bn\b/g, " and ")
    .replace(/\bversus\b|\bvs\.?\b/g, " vs ")
    .replace(/\bsuper nintendo\b|\bsnes\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(value) {
  return new Set(
    normalizeTitle(value)
      .split(" ")
      .filter((token) => token.length > 1),
  );
}

function levenshtein(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array(right.length + 1);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function similarity(leftTitle, rightTitle) {
  const left = normalizeTitle(leftTitle);
  const right = normalizeTitle(rightTitle);
  const edit =
    1 - levenshtein(left, right) / Math.max(left.length, right.length, 1);
  const leftTokens = titleTokens(leftTitle);
  const rightTokens = titleTokens(rightTitle);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token));
  const union = new Set([...leftTokens, ...rightTokens]);
  const tokenScore = union.size ? intersection.length / union.size : 0;
  const containment =
    left.includes(right) || right.includes(left)
      ? Math.min(left.length, right.length) / Math.max(left.length, right.length)
      : 0;
  return Math.max(edit, tokenScore, containment * 0.98);
}

async function fetchText(url, init = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": USER_AGENT,
          ...init.headers,
        },
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }
  throw lastError;
}

async function fetchCached(url, cacheName) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = `${CACHE_DIR}/${cacheName}`;
  try {
    return await readFile(cachePath, "utf8");
  } catch {
    const content = await fetchText(url);
    await writeFile(cachePath, content);
    return content;
  }
}

function parseProducts(markdown) {
  const products = [];
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) continue;
    const titleCell = line.split("|")[2]?.trim();
    const match = titleCell?.match(
      /^\[([^\]]+)\]\((https:\/\/www\.pricecharting\.com\/game\/pal-super-nintendo\/[^)]+)\)$/,
    );
    if (!match) continue;
    const url = new URL(match[2]);
    products.push({
      id: url.pathname,
      path: url.pathname,
      title: decodeHtml(match[1]),
    });
  }
  return products;
}

async function fetchProductIndex() {
  const products = [];
  const seen = new Set();
  let cursor = 0;
  while (true) {
    const readerUrl = `${JINA_READER}/console/pal-super-nintendo?sort=name%26cursor=${cursor}`;
    const markdown = await fetchCached(readerUrl, `index-${cursor}.md`);
    const pageProducts = parseProducts(markdown);
    for (const product of pageProducts) {
      if (!seen.has(product.id)) {
        seen.add(product.id);
        products.push(product);
      }
    }
    if (pageProducts.length === 0) break;
    cursor += 150;
  }
  return products;
}

function findMatches(games, products) {
  const byNormalized = new Map();
  for (const product of products) {
    const normalized = normalizeTitle(product.title);
    const bucket = byNormalized.get(normalized) ?? [];
    bucket.push(product);
    byNormalized.set(normalized, bucket);
  }

  const matches = [];
  for (const game of games) {
    const manualPath = MANUAL_MATCHES[game.id];
    if (manualPath) {
      const product = products.find((candidate) => candidate.path === manualPath);
      matches.push({ game, product, score: product ? 1 : 0, method: "manual" });
      continue;
    }

    const exact = byNormalized.get(normalizeTitle(game.title)) ?? [];
    if (exact.length === 1) {
      matches.push({ game, product: exact[0], score: 1, method: "exact" });
      continue;
    }

    const ranked = products
      .map((product) => ({
        product,
        score: similarity(game.title, product.title),
      }))
      .sort((left, right) => right.score - left.score);
    const best = ranked[0];
    const runnerUp = ranked[1];
    const safe =
      best.score >= 0.82 &&
      (best.score >= 0.92 || best.score - runnerUp.score >= 0.08);
    matches.push({
      game,
      product: safe ? best.product : null,
      score: best.score,
      method: safe ? "fuzzy" : "unmatched",
      suggestions: ranked.slice(0, 3),
    });
  }
  return matches;
}

function parseUsdPrice(value) {
  if (!value || value === "-") return null;
  const amount = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function parsePriceData(markdown) {
  const guide = markdown.match(
    /## Full Price Guide:[\s\S]*?\n\n([\s\S]*?)\n\nAll prices are the current market price\./,
  )?.[1];
  if (!guide) throw new Error("Full price guide not found");
  const read = (label) =>
    parseUsdPrice(
      guide.match(new RegExp(`^${label.replace(" ", "\\s+")}(\\$[\\d,.]+|-)$`, "m"))?.[1],
    );
  return {
    module: read("Loose"),
    cib: read("Complete"),
    new: read("New"),
    box: read("Box Only"),
    manual: read("Manual Only"),
  };
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
      if (index % 20 === 0) {
        process.stdout.write(`\rLoaded ${index + 1}/${items.length}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  process.stdout.write(`\rLoaded ${items.length}/${items.length}\n`);
  return results;
}

async function readExchangeRate() {
  const xml = await fetchText(ECB_DAILY);
  const date = xml.match(/<Cube time='([^']+)'/)?.[1];
  const usdPerEur = Number(
    xml.match(/<Cube currency='USD' rate='([^']+)'/)?.[1],
  );
  if (!date || !Number.isFinite(usdPerEur) || usdPerEur <= 0) {
    throw new Error("ECB USD reference rate not found");
  }
  return { date, usdPerEur };
}

function toEuroCents(usdCents, usdPerEur) {
  return usdCents === null ? null : Math.round(usdCents / usdPerEur);
}

async function applyPriceRows(catalog, rows, exchange) {
  const onlineByGame = new Map(rows.map((row) => [row.gameId, row]));
  const expectedIds = new Set(catalog.games.map((game) => game.id));
  if (
    onlineByGame.size !== catalog.games.length ||
    [...onlineByGame.keys()].some((gameId) => !expectedIds.has(gameId))
  ) {
    throw new Error(
      `Price snapshot does not match catalog: ${onlineByGame.size}/${catalog.games.length}`,
    );
  }

  const missingPrices = [];
  for (const game of catalog.games) {
    const row = onlineByGame.get(game.id);
    const eur = Object.fromEntries(
      Object.entries(row.pricesUsdCents).map(([key, value]) => [
        key,
        toEuroCents(value, exchange.usdPerEur),
      ]),
    );
    for (const [condition, value] of Object.entries(eur)) {
      if (value === null) {
        missingPrices.push({ gameId: game.id, title: game.title, condition });
      }
    }
    game.guidePrices = game.guidePrices ?? game.prices;
    game.prices = eur;
    game.priceSource = {
      provider: "PriceCharting",
      title: row.onlineTitle,
      url: row.sourceUrl,
    };
  }

  catalog.meta = {
    ...catalog.meta,
    title: "SNES PAL Online-Richtwerte",
    source: "PriceCharting",
    sourceUrl: PRICECHARTING_INDEX,
    sourceChecked: new Date().toISOString(),
    exchangeRateSource: "European Central Bank",
    exchangeRateDate: exchange.date,
    usdPerEur: exchange.usdPerEur,
    guideSourceCreated:
      catalog.meta.guideSourceCreated ?? catalog.meta.sourceCreated ?? "2020-07-05",
    missingPriceCount: missingPrices.length,
  };
  delete catalog.meta.sourceCreated;
  await writeFile(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  return missingPrices;
}

const catalog = JSON.parse(await readFile(CATALOG_PATH, "utf8"));

if (SNAPSHOT_PATH) {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  const exchange = await readExchangeRate();
  const missingPrices = await applyPriceRows(catalog, snapshot, exchange);
  console.log(`Updated ${catalog.games.length} games from ${SNAPSHOT_PATH}.`);
  console.log(`Missing condition prices: ${missingPrices.length}`);
  for (const missing of missingPrices) {
    console.log(`  ${missing.title}: ${missing.condition}`);
  }
  process.exit(0);
}

const products = await fetchProductIndex();
const matches = findMatches(catalog.games, products);
const unresolved = matches.filter((match) => !match.product);
const fuzzy = matches.filter((match) => match.method === "fuzzy");

console.log(`PriceCharting products: ${products.length}`);
console.log(`Catalog games: ${catalog.games.length}`);
console.log(`Exact/manual matches: ${matches.length - fuzzy.length - unresolved.length}`);
console.log(`Fuzzy matches: ${fuzzy.length}`);
console.log(`Unresolved: ${unresolved.length}`);

if (fuzzy.length) {
  console.log("\nFuzzy matches:");
  for (const match of fuzzy) {
    console.log(
      `  ${match.game.title} -> ${match.product.title} (${match.score.toFixed(3)})`,
    );
  }
}

if (unresolved.length) {
  console.log("\nUnresolved matches:");
  for (const match of unresolved) {
    console.log(`  ${match.game.id}: ${match.game.title}`);
    for (const suggestion of match.suggestions ?? []) {
      console.log(
        `    ${suggestion.score.toFixed(3)} ${suggestion.product.title} ${suggestion.product.path}`,
      );
    }
  }
}

if (DUMP_MATCHES && !unresolved.length) {
  await writeFile(
    "/tmp/snes-pal-price-matches.json",
    `${JSON.stringify(
      matches.map((match) => ({
        gameId: match.game.id,
        gameTitle: match.game.title,
        onlineTitle: match.product.title,
        path: match.product.path,
      })),
      null,
      2,
    )}\n`,
  );
  console.log("Wrote /tmp/snes-pal-price-matches.json");
}

if (!APPLY) process.exit(unresolved.length ? 2 : 0);
if (unresolved.length) {
  throw new Error("Resolve every title match before applying prices");
}

const exchange = await readExchangeRate();
const onlineRows = await mapConcurrent(matches, 12, async (match) => {
  const markdown = await fetchCached(
    `${JINA_READER}${match.product.path}`,
    `game-${match.game.id}.md`,
  );
  const usd = parsePriceData(markdown);
  return {
    gameId: match.game.id,
    onlineTitle: match.product.title,
    sourceUrl: `${PRICECHARTING_BASE}${match.product.path}`,
    pricesUsdCents: usd,
  };
});

const missingPrices = await applyPriceRows(catalog, onlineRows, exchange);
console.log(`Updated ${catalog.games.length} games.`);
console.log(`Missing condition prices: ${missingPrices.length}`);
for (const missing of missingPrices) {
  console.log(`  ${missing.title}: ${missing.condition}`);
}
