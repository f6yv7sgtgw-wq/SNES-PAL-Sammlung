"use client";

import { useLayoutEffect } from "react";
import CollectionManager, {
  type Game,
  type PriceMeta,
} from "./collection-manager-v034";

export type { Game, PriceMeta } from "./collection-manager-v034";

export default function ProjectSnesManager({
  games,
  priceMeta,
}: {
  games: Game[];
  priceMeta: PriceMeta;
}) {
  useLayoutEffect(() => {
    const heading = document.querySelector<HTMLHeadingElement>(".title-row h1");
    if (heading) heading.textContent = "Projekt SNES";
  }, []);

  return <CollectionManager games={games} priceMeta={priceMeta} />;
}
