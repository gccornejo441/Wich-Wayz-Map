import Fuse from "fuse.js";
import { IndexedDBShop } from "./indexedDB";
import { getCachedShops } from "./mapService";

export const SearchShops = async (
  query: string,
): Promise<{ shop: IndexedDBShop }[]> => {
  const shops: IndexedDBShop[] = await getCachedShops();
  const options = {
    shouldSort: true,
    includeMatches: true,
    threshold: 0.3,
    keys: [
      {
        name: "name",
        weight: 0.7,
      },
      {
        name: "description",
        weight: 0.3,
      },
    ],
  };

  const fuse = new Fuse(shops, options);

  const results = fuse.search(query);

  return results.map((result) => ({ shop: result.item }));
};
