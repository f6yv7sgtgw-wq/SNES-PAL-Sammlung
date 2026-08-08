"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Game } from "./collection-manager";
import {
  buildParserQuery,
  evaluateKleinanzeigenListing,
  mergeEvaluatedOffers,
  reclassifyEvaluatedOffer,
  type EvaluatedOffer,
  type OfferColor,
  type ParserListing,
} from "./search-evaluation";

const GENERIC_PARSER_URL = "https://genericparser.f6yv7sgtgw.workers.dev";
const SEARCH_STORAGE_KEY = "snes-pal-kleinanzeigen-search-v03-2";
const SEARCH_CONTRACT = "generic-parser-module-v1";

type RunStatus = "idle" | "running" | "stopping" | "paused" | "complete" | "error";

type SearchSession = {
  version: 2;
  status: RunStatus;
  queue: string[];
  gameIndex: number;
  page: number;
  currentGameId: string | null;
  completedGameIds: string[];
  results: Record<string, EvaluatedOffer>;
  requestCount: number;
  rawListingCount: number;
  ignored: {
    irrelevant: number;
    pickupOnly: number;
    wrongSource: number;
  };
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
};

type WorkerState = {
  status: "idle" | "checking" | "ready" | "error";
  version: string | null;
  build: string | null;
  message: string;
};

type ParserResponse = {
  contract?: string;
  listings?: ParserListing[];
  pagination?: {
    next_page?: number | null;
    complete?: boolean;
    source?: string | null;
  };
  summary?: {
    sources?: {
      vinted?: { enabled?: boolean };
      kleinanzeigen?: { enabled?: boolean; status?: string };
    };
  };
  source_status?: {
    vinted?: { enabled?: boolean };
    kleinanzeigen?: { enabled?: boolean; status?: string };
  };
};

const EMPTY_SESSION: SearchSession = {
  version: 2,
  status: "idle",
  queue: [],
  gameIndex: 0,
  page: 0,
  currentGameId: null,
  completedGameIds: [],
  results: {},
  requestCount: 0,
  rawListingCount: 0,
  ignored: { irrelevant: 0, pickupOnly: 0, wrongSource: 0 },
  startedAt: null,
  updatedAt: null,
  completedAt: null,
  lastError: null,
};

const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

function formatEuro(cents: number | null) {
  return cents === null ? "–" : euroFormatter.format(cents / 100);
}

function formatDateTime(value: string | null) {
  if (!value) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value: number | null) {
  if (value === null) return "–";
  if (value > 0) return `+${value} %`;
  if (value < 0) return `−${Math.abs(value)} %`;
  return "0 %";
}

function colorLabel(color: OfferColor) {
  if (color === "green") return "Grün";
  if (color === "yellow") return "Gelb";
  if (color === "orange") return "Orange";
  if (color === "red") return "Rot";
  return "Unklar";
}

function offerColorLabel(color: OfferColor) {
  if (color === "green") return "Gut / günstig";
  if (color === "yellow") return "11–25 % darüber";
  if (color === "orange") return "26–40 % darüber";
  if (color === "red") return "Ab 41 % / unpassend";
  return "Nicht bewertbar";
}

function statusLabel(status: RunStatus) {
  if (status === "running") return "Suche läuft";
  if (status === "stopping") return "Stoppt nach aktuellem Paket";
  if (status === "paused") return "Pausiert";
  if (status === "complete") return "Vollsuche abgeschlossen";
  if (status === "error") return "Unterbrochen";
  return "Noch nicht gestartet";
}

function cleanSession(value: unknown, validGameIds: Set<string>): SearchSession {
  if (!value || typeof value !== "object") return EMPTY_SESSION;
  const candidate = value as Partial<SearchSession>;
  if (candidate.version !== 2) return EMPTY_SESSION;
  const queue = Array.isArray(candidate.queue)
    ? candidate.queue.filter((id): id is string => typeof id === "string" && validGameIds.has(id))
    : [];
  const results: Record<string, EvaluatedOffer> = {};
  if (candidate.results && typeof candidate.results === "object") {
    for (const [key, raw] of Object.entries(candidate.results)) {
      if (
        raw &&
        typeof raw === "object" &&
        (raw as EvaluatedOffer).source === "kleinanzeigen" &&
        typeof (raw as EvaluatedOffer).url === "string"
      ) {
        results[key] = reclassifyEvaluatedOffer(raw as EvaluatedOffer);
      }
    }
  }
  const rememberedStatus = candidate.status;
  const status: RunStatus =
    rememberedStatus === "running" || rememberedStatus === "stopping"
      ? "paused"
      : rememberedStatus && ["idle", "paused", "complete", "error"].includes(rememberedStatus)
        ? rememberedStatus
        : "idle";
  return {
    ...EMPTY_SESSION,
    ...candidate,
    version: 2,
    status,
    queue,
    results,
    gameIndex: Math.min(Math.max(Number(candidate.gameIndex) || 0, 0), queue.length),
    page: Math.max(Number(candidate.page) || 0, 0),
    currentGameId:
      typeof candidate.currentGameId === "string" && validGameIds.has(candidate.currentGameId)
        ? candidate.currentGameId
        : null,
    completedGameIds: Array.isArray(candidate.completedGameIds)
      ? candidate.completedGameIds.filter(
          (id): id is string => typeof id === "string" && validGameIds.has(id),
        )
      : [],
    ignored: {
      irrelevant: Number(candidate.ignored?.irrelevant) || 0,
      pickupOnly: Number(candidate.ignored?.pickupOnly) || 0,
      wrongSource: Number(candidate.ignored?.wrongSource) || 0,
    },
  };
}

async function waitForUi() {
  await new Promise((resolve) => window.setTimeout(resolve, 50));
}

export default function SearchPanel({
  active,
  games,
  ownedIds,
  onAddGame,
}: {
  active: boolean;
  games: Game[];
  ownedIds: Set<string>;
  onAddGame: (gameId: string) => void;
}) {
  const [session, setSession] = useState<SearchSession>(EMPTY_SESSION);
  const [hydrated, setHydrated] = useState(false);
  const [worker, setWorker] = useState<WorkerState>({
    status: "idle",
    version: null,
    build: null,
    message: "Noch nicht geprüft",
  });
  const [trafficFilter, setTrafficFilter] = useState<OfferColor | "all">("all");
  const [resultQuery, setResultQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(40);
  const [storageWarning, setStorageWarning] = useState("");
  const sessionRef = useRef(session);
  const ownedIdsRef = useRef(ownedIds);
  const stopRequested = useRef(false);
  const running = useRef(false);
  const mounted = useRef(true);

  const gameById = useMemo(
    () => new Map(games.map((game) => [game.id, game])),
    [games],
  );
  const validGameIds = useMemo(() => new Set(gameById.keys()), [gameById]);

  useEffect(() => {
    ownedIdsRef.current = ownedIds;
  }, [ownedIds]);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(SEARCH_STORAGE_KEY);
        if (stored) {
          const restored = cleanSession(JSON.parse(stored), validGameIds);
          sessionRef.current = restored;
          setSession(restored);
        }
      } catch {
        // A broken search cache must never block the collection manager.
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      mounted.current = false;
      stopRequested.current = true;
    };
  }, [validGameIds]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      window.setTimeout(
        () =>
          setStorageWarning(
            "Suchergebnisse konnten wegen des lokalen Speicherlimits nicht vollständig gesichert werden.",
          ),
        0,
      );
    }
  }, [hydrated, session]);

  function commit(next: SearchSession) {
    sessionRef.current = next;
    if (mounted.current) setSession(next);
  }

  async function checkWorker() {
    setWorker((current) => ({ ...current, status: "checking", message: "Verbindung wird geprüft …" }));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`${GENERIC_PARSER_URL}/health`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        status?: string;
        version?: string;
        build_id?: string;
        api_contract?: string;
        search_ready?: boolean;
      };
      if (
        !response.ok ||
        payload.status !== "ok" ||
        payload.search_ready !== true ||
        payload.api_contract !== SEARCH_CONTRACT
      ) {
        throw new Error("Parser meldet keinen kompatiblen Suchdienst.");
      }
      const ready: WorkerState = {
        status: "ready",
        version: payload.version || null,
        build: payload.build_id || null,
        message: "Kleinanzeigen-Parser bereit",
      };
      if (mounted.current) setWorker(ready);
      return true;
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Parser-Prüfung hat zu lange gedauert."
          : error instanceof Error
            ? error.message
            : "Parser ist nicht erreichbar.";
      if (mounted.current) {
        setWorker({ status: "error", version: null, build: null, message });
      }
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  useEffect(() => {
    if (!active || worker.status !== "idle") return;
    const timer = window.setTimeout(() => void checkWorker(), 0);
    return () => window.clearTimeout(timer);
  }, [active, worker.status]);

  async function fetchPacket(game: Game, page: number) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 50_000);
    const moduleValue = game.prices.module;
    const query = buildParserQuery(game.title);
    try {
      const response = await fetch(`${GENERIC_PARSER_URL}/api/search`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-GenericParser-Contract": SEARCH_CONTRACT,
        },
        body: JSON.stringify({
          mode: "live",
          query,
          page,
          source: "kleinanzeigen",
          accept_bundles: true,
          accept_incomplete: false,
          include_review: true,
          include_rejected: true,
          sort_by: "relevance",
          ...(moduleValue === null ? {} : { market_value: moduleValue / 100 }),
        }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as ParserResponse & {
        detail?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || `Parserfehler HTTP ${response.status}`);
      }
      const responseContract = response.headers.get("X-GenericParser-Contract");
      const declaredContracts = [responseContract, payload.contract].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      );
      if (
        !declaredContracts.length ||
        declaredContracts.some((contract) => contract !== SEARCH_CONTRACT)
      ) {
        throw new Error("Quellenprüfung fehlgeschlagen: Parservertrag stimmt nicht überein.");
      }
      const vintedEnabled =
        payload.summary?.sources?.vinted?.enabled === true ||
        payload.source_status?.vinted?.enabled === true;
      if (vintedEnabled) {
        throw new Error("Quellenprüfung fehlgeschlagen: Vinted war unerwartet aktiv.");
      }
      const responseSource = String(payload.pagination?.source || "").toLocaleLowerCase("de-DE");
      if (!responseSource.includes("kleinanzeigen")) {
        throw new Error("Quellenprüfung fehlgeschlagen: Antwort stammt nicht nur von Kleinanzeigen.");
      }
      const foreignListing = (payload.listings || []).find((listing) => {
        const source = String(listing.source || listing.source_label || "").toLocaleLowerCase("de-DE");
        return !source.includes("kleinanzeigen");
      });
      if (foreignListing) {
        throw new Error("Quellenprüfung fehlgeschlagen: Fremdquelle im Arbeitspaket.");
      }
      return payload;
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Das aktuelle Arbeitspaket hat zu lange gedauert."
          : error instanceof Error
            ? error.message
            : "Das aktuelle Arbeitspaket konnte nicht verarbeitet werden.";
      throw new Error(`${game.title}: ${message}`);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function runSearch(initial: SearchSession) {
    if (running.current) return;
    running.current = true;
    stopRequested.current = false;
    let current: SearchSession = {
      ...initial,
      status: "running",
      lastError: null,
      updatedAt: new Date().toISOString(),
    };
    commit(current);

    try {
      for (let index = current.gameIndex; index < current.queue.length; index += 1) {
        const gameId = current.queue[index];
        const game = gameById.get(gameId);
        if (!game || ownedIdsRef.current.has(gameId)) {
          current = {
            ...current,
            gameIndex: index + 1,
            page: 0,
            currentGameId: null,
            completedGameIds: Array.from(new Set([...current.completedGameIds, gameId])),
            updatedAt: new Date().toISOString(),
          };
          commit(current);
          continue;
        }

        let page = index === current.gameIndex ? current.page : 0;
        const seenPages = new Set<number>();
        while (true) {
          if (stopRequested.current) {
            current = {
              ...current,
              status: "paused",
              gameIndex: index,
              page,
              currentGameId: game.id,
              updatedAt: new Date().toISOString(),
            };
            commit(current);
            return;
          }
          if (seenPages.has(page)) throw new Error("Der Parser hat dieselbe Ergebnisseite wiederholt.");
          seenPages.add(page);
          current = {
            ...current,
            status: "running",
            gameIndex: index,
            page,
            currentGameId: game.id,
            updatedAt: new Date().toISOString(),
          };
          commit(current);

          const packet = await fetchPacket(game, page);
          const listings = Array.isArray(packet.listings) ? packet.listings : [];
          const results = { ...current.results };
          const ignored = { ...current.ignored };
          for (const listing of listings) {
            const evaluated = evaluateKleinanzeigenListing(
              listing,
              game,
              games,
              ownedIdsRef.current,
            );
            if (evaluated.kind === "ignored") {
              if (evaluated.reason === "pickup-only") ignored.pickupOnly += 1;
              else if (evaluated.reason === "not-kleinanzeigen") ignored.wrongSource += 1;
              else ignored.irrelevant += 1;
              continue;
            }
            results[evaluated.offer.id] = mergeEvaluatedOffers(
              results[evaluated.offer.id],
              evaluated.offer,
            );
          }

          const rawNext = packet.pagination?.next_page;
          const nextPage = typeof rawNext === "number" ? rawNext : null;
          if (nextPage !== null && (nextPage <= page || nextPage > 2000)) {
            throw new Error("Der Parser hat einen ungültigen Fortsetzungspunkt geliefert.");
          }
          current = {
            ...current,
            results,
            ignored,
            requestCount: current.requestCount + 1,
            rawListingCount: current.rawListingCount + listings.length,
            page: nextPage ?? 0,
            updatedAt: new Date().toISOString(),
          };
          commit(current);
          if (nextPage === null || packet.pagination?.complete === true) break;
          page = nextPage;
        }

        current = {
          ...current,
          gameIndex: index + 1,
          page: 0,
          currentGameId: null,
          completedGameIds: Array.from(new Set([...current.completedGameIds, game.id])),
          updatedAt: new Date().toISOString(),
        };
        commit(current);
        await waitForUi();
      }

      current = {
        ...current,
        status: "complete",
        gameIndex: current.queue.length,
        page: 0,
        currentGameId: null,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      commit(current);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Die Suche wurde unerwartet unterbrochen.";
      current = {
        ...current,
        status: stopRequested.current ? "paused" : "error",
        lastError: message,
        updatedAt: new Date().toISOString(),
      };
      commit(current);
    } finally {
      running.current = false;
    }
  }

  async function startFreshSearch() {
    if (running.current) return;
    const ready = worker.status === "ready" || (await checkWorker());
    if (!ready) return;
    const now = new Date().toISOString();
    const queue = games.filter((game) => !ownedIdsRef.current.has(game.id)).map((game) => game.id);
    const next: SearchSession = {
      ...EMPTY_SESSION,
      status: queue.length ? "running" : "complete",
      queue,
      startedAt: now,
      updatedAt: now,
      completedAt: queue.length ? null : now,
    };
    commit(next);
    setVisibleCount(40);
    if (queue.length) await runSearch(next);
  }

  async function resumeSearch() {
    if (running.current || !sessionRef.current.queue.length) return;
    const ready = worker.status === "ready" || (await checkWorker());
    if (!ready) return;
    await runSearch(sessionRef.current);
  }

  function requestStop() {
    if (!running.current) return;
    stopRequested.current = true;
    commit({
      ...sessionRef.current,
      status: "stopping",
      updatedAt: new Date().toISOString(),
    });
  }

  function resetSearch() {
    if (running.current) return;
    if (!window.confirm("Suchfortschritt und alle gefundenen Angebote löschen?")) return;
    commit(EMPTY_SESSION);
    window.localStorage.removeItem(SEARCH_STORAGE_KEY);
    setVisibleCount(40);
  }

  const offers = useMemo(() => {
    const normalizedQuery = resultQuery.trim().toLocaleLowerCase("de-DE");
    const colorOrder: Record<OfferColor, number> = {
      green: 0,
      yellow: 1,
      orange: 2,
      red: 3,
      unknown: 4,
    };
    return Object.values(session.results)
      .filter((offer) => trafficFilter === "all" || offer.color === trafficFilter)
      .filter((offer) => {
        if (!normalizedQuery) return true;
        const gameTitles = offer.matchedGameIds
          .map((id) => gameById.get(id)?.title || "")
          .join(" ");
        return `${offer.title} ${offer.description} ${gameTitles}`
          .toLocaleLowerCase("de-DE")
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        const color = colorOrder[left.color] - colorOrder[right.color];
        if (color) return color;
        return (right.differenceCents ?? -Infinity) - (left.differenceCents ?? -Infinity);
      });
  }, [gameById, resultQuery, session.results, trafficFilter]);

  const offerCounts = useMemo(() => {
    const counts: Record<OfferColor, number> = {
      green: 0,
      yellow: 0,
      orange: 0,
      red: 0,
      unknown: 0,
    };
    for (const offer of Object.values(session.results)) counts[offer.color] += 1;
    return counts;
  }, [session.results]);

  const queueTotal = session.queue.length;
  const queueDone = Math.min(session.gameIndex, queueTotal);
  const progress = queueTotal ? (queueDone / queueTotal) * 100 : 0;
  const currentGame = session.currentGameId ? gameById.get(session.currentGameId) : null;

  return (
    <section className="panel main-panel search-panel" hidden={!active}>
      <div className="section-heading search-heading">
        <div>
          <p className="eyebrow">Ausschließlich Kleinanzeigen</p>
          <h2>Fehlende PAL-Spiele suchen</h2>
        </div>
        <span className={`worker-badge is-${worker.status}`}>
          <span aria-hidden="true" />
          {worker.status === "ready" ? `Parser ${worker.version ?? "bereit"}` : worker.message}
        </span>
      </div>

      <div className="search-scope" role="note">
        <span>Deutschlandweit</span>
        <span>Nur Versand</span>
        <span>Quelle fest auf Kleinanzeigen</span>
        <span>Keine Vinted- oder Händlerdaten</span>
      </div>

      <div className="search-control-grid">
        <article className="search-run-card">
          <div className="search-run-topline">
            <div>
              <span className="search-status-label">{statusLabel(session.status)}</span>
              <strong>
                {currentGame
                  ? currentGame.title
                  : queueTotal
                    ? `${queueDone} von ${queueTotal} Spielen geprüft`
                    : `${games.length - ownedIds.size} Spiele fehlen`}
              </strong>
            </div>
            <span className="search-percent">{progress.toFixed(1)} %</span>
          </div>
          <div
            aria-label={`${progress.toFixed(1)} Prozent der Suchliste bearbeitet`}
            className="search-progress"
            role="progressbar"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="search-run-copy">
            Jede fehlende Cartridge wird nacheinander bis zum natürlichen Ende der
            Kleinanzeigen-Ergebnisse geprüft. Fortschritt und Treffer bleiben lokal
            gespeichert; eine unterbrochene Suche kann fortgesetzt werden.
          </p>
          {session.lastError ? <p className="search-error">{session.lastError}</p> : null}
          {storageWarning ? <p className="search-error">{storageWarning}</p> : null}
          <div className="search-actions">
            {session.status === "running" || session.status === "stopping" ? (
              <button
                className="secondary-button"
                disabled={session.status === "stopping"}
                onClick={requestStop}
                type="button"
              >
                {session.status === "stopping" ? "Stopp angefordert" : "Sanft stoppen"}
              </button>
            ) : session.queue.length && session.status !== "complete" ? (
              <>
                <button className="primary-button" onClick={() => void resumeSearch()} type="button">
                  Suche fortsetzen
                </button>
                <button className="secondary-button" onClick={() => void startFreshSearch()} type="button">
                  Neu starten
                </button>
              </>
            ) : (
              <button className="primary-button" onClick={() => void startFreshSearch()} type="button">
                {session.status === "complete" ? "Erneut vollständig suchen" : "Alle fehlenden suchen"}
              </button>
            )}
            <button
              className="secondary-button"
              disabled={
                session.status === "running" ||
                session.status === "stopping" ||
                (!session.requestCount && !Object.keys(session.results).length)
              }
              onClick={resetSearch}
              type="button"
            >
              Ergebnisse löschen
            </button>
            {worker.status === "error" ? (
              <button className="secondary-button" onClick={() => void checkWorker()} type="button">
                Parser erneut prüfen
              </button>
            ) : null}
          </div>
        </article>

        <article className="traffic-legend">
          <div>
            <span className="traffic-dot is-green" />
            <p><strong>Grün</strong><small>günstiger oder bis 10 % über Richtwert</small></p>
          </div>
          <div>
            <span className="traffic-dot is-yellow" />
            <p><strong>Gelb</strong><small>11 bis 25 % über Richtwert</small></p>
          </div>
          <div>
            <span className="traffic-dot is-orange" />
            <p><strong>Orange</strong><small>26 bis 40 % über Richtwert</small></p>
          </div>
          <div>
            <span className="traffic-dot is-red" />
            <p><strong>Rot</strong><small>ab 41 % darüber oder unpassend</small></p>
          </div>
          <div>
            <span className="traffic-dot is-unknown" />
            <p><strong>Unklar</strong><small>Preis, Zuordnung oder Konvolut nicht bewertbar</small></p>
          </div>
          <p className="legend-note">
            Erkannte Versandkosten sind enthalten. Bei offenen Versandkosten wird
            der Angebotspreis vor Versand bewertet und klar gekennzeichnet.
          </p>
        </article>
      </div>

      <div className="search-metrics" aria-label="Suchstatistik">
        <div><span>Spiele geprüft</span><strong>{queueDone}</strong></div>
        <div><span>Arbeitspakete</span><strong>{session.requestCount}</strong></div>
        <div><span>Angebote</span><strong>{Object.keys(session.results).length}</strong></div>
        <div className="is-green"><span>Grüne Treffer</span><strong>{offerCounts.green}</strong></div>
      </div>

      <div className="search-results-heading">
        <div>
          <p className="eyebrow">Preisvergleich</p>
          <h3>Gefundene Angebote</h3>
        </div>
        <span className="badge">Stand {formatDateTime(session.updatedAt)}</span>
      </div>

      <div className="search-result-tools">
        <label className="search-box">
          <span className="sr-only">Angebote durchsuchen</span>
          <span aria-hidden="true">⌕</span>
          <input
            onChange={(event) => {
              setResultQuery(event.target.value);
              setVisibleCount(40);
            }}
            placeholder="Angebote oder Spiele suchen …"
            type="search"
            value={resultQuery}
          />
        </label>
        <div className="traffic-filters" aria-label="Ampelfilter">
          {(["all", "green", "yellow", "orange", "red", "unknown"] as const).map((color) => (
            <button
              aria-pressed={trafficFilter === color}
              className={trafficFilter === color ? `is-active is-${color}` : `is-${color}`}
              key={color}
              onClick={() => {
                setTrafficFilter(color);
                setVisibleCount(40);
              }}
              type="button"
            >
              {color === "all"
                ? `Alle ${Object.keys(session.results).length}`
                : `${colorLabel(color)} ${offerCounts[color]}`}
            </button>
          ))}
        </div>
      </div>

      {offers.length ? (
        <div className="search-results-list">
          {offers.slice(0, visibleCount).map((offer) => {
            const matchedGames = offer.matchedGameIds
              .map((id) => gameById.get(id))
              .filter((game): game is Game => Boolean(game));
            const missingGames = matchedGames.filter((game) => !ownedIds.has(game.id));
            const ownedGames = matchedGames.filter((game) => ownedIds.has(game.id));
            return (
              <article className={`search-result is-${offer.color}`} key={offer.id}>
                <div className="offer-image">
                  {offer.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="Kleinanzeigen-Vorschaubild" loading="lazy" src={offer.imageUrl} />
                  ) : (
                    <span>KA</span>
                  )}
                </div>
                <div className="offer-body">
                  <div className="offer-topline">
                    <div>
                      <div className="offer-badges">
                        <span className={`traffic-pill is-${offer.color}`}>
                          <span className={`traffic-dot is-${offer.color}`} />
                          {offerColorLabel(offer.color)}
                        </span>
                        <span>{offer.isBundle ? "Konvolut" : "Einzelangebot"}</span>
                        <span>{offer.conditionLabel}</span>
                        {!offer.comparisonIncludesShipping ? <span>Versand offen</span> : null}
                      </div>
                      <h4>{offer.title}</h4>
                    </div>
                    <strong className="offer-price">
                      {formatEuro(offer.priceCents)}
                      {offer.priceRaw?.toLocaleLowerCase("de-DE").includes("vb") ? <small> VB</small> : null}
                    </strong>
                  </div>

                  <div className="offer-comparison">
                    <div><span>Angebot</span><strong>{formatEuro(offer.priceCents)}</strong></div>
                    <div><span>Versand</span><strong>{offer.shippingCents === null ? "offen" : formatEuro(offer.shippingCents)}</strong></div>
                    <div><span>Gesamt</span><strong>{formatEuro(offer.totalCents)}</strong></div>
                    <div><span>Richtwert</span><strong>{formatEuro(offer.referenceCents)}</strong></div>
                    <div><span>Abweichung</span><strong>{formatPercent(offer.deviationPercent)}</strong></div>
                    <div className={offer.differenceCents !== null && offer.differenceCents > 0 ? "is-saving" : ""}>
                      <span>Differenz</span>
                      <strong>
                        {offer.differenceCents === null
                          ? "–"
                          : `${offer.differenceCents > 0 ? "−" : "+"}${formatEuro(Math.abs(offer.differenceCents))}`}
                      </strong>
                    </div>
                  </div>

                  <p className="offer-reason">{offer.reason}</p>
                  <div className="offer-games">
                    {missingGames.map((game) => (
                      <span className="is-missing" key={game.id}>{game.title}</span>
                    ))}
                    {ownedGames.map((game) => (
                      <span className="is-owned" key={game.id}>{game.title} · vorhanden</span>
                    ))}
                  </div>
                  {offer.description ? <p className="offer-description">{offer.description}</p> : null}
                  <div className="offer-footer">
                    <div>
                      <span>{offer.shippingLabel}</span>
                      {offer.place ? <span>{offer.place}</span> : null}
                      {offer.postedAt ? <span>{offer.postedAt}</span> : null}
                    </div>
                    <div className="offer-actions">
                      {missingGames.length === 1 ? (
                        <button className="secondary-button" onClick={() => onAddGame(missingGames[0].id)} type="button">
                          Zur Sammlung
                        </button>
                      ) : null}
                      <a className="primary-button" href={offer.url} rel="noreferrer" target="_blank">
                        Anzeige öffnen
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state compact-empty search-empty">
          <h3>{Object.keys(session.results).length ? "Kein Angebot passt zum Filter" : "Noch keine Angebote"}</h3>
          <p>
            {Object.keys(session.results).length
              ? "Ändere die Ampel oder den Suchbegriff."
              : "Starte die Vollsuche. Abholangebote und Ergebnisse anderer Quellen werden nicht übernommen."}
          </p>
        </div>
      )}

      {offers.length > visibleCount ? (
        <button className="secondary-button load-more" onClick={() => setVisibleCount((count) => count + 40)} type="button">
          Weitere 40 Angebote anzeigen
        </button>
      ) : null}

      {session.ignored.pickupOnly || session.ignored.wrongSource ? (
        <p className="search-audit-note">
          Ausgeblendet: {session.ignored.pickupOnly} reine Abholangebote und {session.ignored.wrongSource} Ergebnisse anderer Quellen.
        </p>
      ) : null}
    </section>
  );
}
