import Fuse from "fuse.js";
import { getCachedData } from "./indexedDB";
import { Shop } from "./shopLoaction";

export const SearchShops = async (query: string): Promise<{ shop: Shop }[]> => {
  const shops = await getCachedData("shops");

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
