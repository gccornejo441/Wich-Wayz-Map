import Fuse from "fuse.js";
import { IndexedDBShop } from "./indexedDB";
import { getCachedShops } from "./mapService";
import { ShopFilters } from "@/types/shopFilter";

export const SearchShops = async (
  query: string,
  filters?: ShopFilters
): Promise<{ shop: IndexedDBShop }[]> => {
  let shops: IndexedDBShop[] = await getCachedShops();

  if (filters) {
    const { city, state, country, categoryIds, locationOpen } = filters;

    shops = shops.filter((shop) => {
      const loc = shop.locations?.[0];
      if (!loc) return false;

      if (city && !loc.city?.toLowerCase().includes(city.toLowerCase()))
        return false;
      if (state && !loc.state?.toLowerCase().includes(state.toLowerCase()))
        return false;
      if (
        country &&
        !loc.country?.toLowerCase().includes(country.toLowerCase())
      )
        return false;

      if (locationOpen && !("location_open" in loc ? loc.location_open : true))
        return false;

      if (
        categoryIds &&
        categoryIds.length > 0 &&
        !shop.categories.some((cat) => categoryIds.includes(cat.id))
      ) {
        return false;
      }

      return true;
    });
  }

  const options = {
    shouldSort: true,
    includeMatches: true,
    threshold: 0.3,
    keys: [
      { name: "name", weight: 0.7 },
      { name: "description", weight: 0.3 },
    ],
  };

  const fuse = new Fuse(shops, options);
  const results = query.trim()
    ? fuse.search(query).map((r) => ({ shop: r.item }))
    : shops.map((s) => ({ shop: s }));

  console.log("Filtered results count:", results.length);
  console.log(
    "Result shop names:",
    results.map((r) => r.shop.name)
  );

  return results;
};
