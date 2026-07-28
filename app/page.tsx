import CollectionManager, { type Game } from "./collection-manager";
import catalog from "./snes-games.json";

export default function Home() {
  return <CollectionManager games={catalog.games as Game[]} />;
}
