import CollectionManager, {
  type Game,
  type PriceMeta,
} from "./collection-manager";
import catalog from "./snes-games.json";

export default function Home() {
  return (
    <CollectionManager
      games={catalog.games as Game[]}
      priceMeta={catalog.meta as PriceMeta}
    />
  );
}
