import { createRoot } from "react-dom/client";
import CollectionManager, {
  type Game,
  type PriceMeta,
} from "../app/collection-manager";
import catalog from "../app/snes-games.json";
import "../app/globals.css";

const baseUrl = import.meta.env.BASE_URL;
const games = (catalog.games as Game[]).map((game) => ({
  ...game,
  cover: game.cover
    ? `${baseUrl}${game.cover.replace(/^\//, "")}`
    : null,
}));

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

createRoot(root).render(
  <CollectionManager
    games={games}
    priceMeta={catalog.meta as PriceMeta}
  />,
);
