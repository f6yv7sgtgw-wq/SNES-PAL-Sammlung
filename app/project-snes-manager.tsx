"use client";

import { useLayoutEffect } from "react";
import CollectionManager, {
  type Game,
  type PriceMeta,
} from "./collection-manager-v034";
import { INITIAL_COLLECTION_STATE } from "./initial-collection";
import {
  mergeCollectionStates,
  sanitizeState,
} from "./collection-model";

export type { Game, PriceMeta } from "./collection-manager-v034";

const STORAGE_KEY = "snes-pal-sammlung-v2";
const BASELINE_MARKER_KEY = "snes-pal-sammlung-baseline-0.3.4";

export default function ProjectSnesManager({
  games,
  priceMeta,
}: {
  games: Game[];
  priceMeta: PriceMeta;
}) {
  useLayoutEffect(() => {
    const gameIds = new Set(games.map((game) => game.id));

    // 0.3.4 originally created an empty v2 browser state on some existing
    // installations before the embedded Excel baseline was applied. Seed the
    // baseline exactly once and let every existing browser entry win on merge.
    if (window.localStorage.getItem(BASELINE_MARKER_KEY) !== "1") {
      const baseline = sanitizeState(INITIAL_COLLECTION_STATE, gameIds);
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const existing = stored
          ? sanitizeState(JSON.parse(stored), gameIds)
          : { version: 2 as const, owned: {} };
        const merged = mergeCollectionStates(baseline, existing);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baseline));
      }
      window.localStorage.setItem(BASELINE_MARKER_KEY, "1");
    }

    const heading = document.querySelector<HTMLHeadingElement>(".title-row h1");
    if (heading) heading.textContent = "Projekt SNES";
    const badge = document.querySelector<HTMLElement>(".version-badge");
    if (badge) badge.textContent = "v0.3.5";
  }, [games]);

  return (
    <>
      <span hidden data-project-version="0.3.5">
        v0.3.5
      </span>
      <CollectionManager games={games} priceMeta={priceMeta} />
    </>
  );
}
