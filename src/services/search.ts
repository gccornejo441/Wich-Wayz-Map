import Fuse from "fuse.js";
import { ShopFilters } from "@/types/shopFilter";
import {
  SHOPS_STORE,
  FILTERED_SHOPS_STORE,
  IndexedDBShop,
  cacheData,
  getCachedData,
} from "./indexedDB";

export const SearchShops = async (
  query: string,
  filters?: ShopFilters,
  updateCache: boolean = false
): Promise<{ shop: IndexedDBShop }[]> => {
  let shops: IndexedDBShop[] = await getCachedData(SHOPS_STORE);

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
      if (locationOpen && loc.location_open === false) return false;

      if (categoryIds && categoryIds.length > 0) {
        const shopCategoryIds = shop.categories.map((cat) => cat.id);
        const hasMatchingCategory = shopCategoryIds.some((id) =>
          categoryIds.includes(id)
        );

        console.log(`Checking shop: ${shop.name}`);
        console.log(`→ Shop categories: ${JSON.stringify(shopCategoryIds)}`);
        console.log(`→ Filtered categoryIds: ${JSON.stringify(categoryIds)}`);
        console.log(`→ Match: ${hasMatchingCategory}`);

        if (!hasMatchingCategory) return false;
      }

      return true;
    });

    if (updateCache) {
      await cacheData(FILTERED_SHOPS_STORE, shops);
    }
  } else {
    shops = await getCachedData(FILTERED_SHOPS_STORE);
  }

  const fuse = new Fuse(shops, {
    shouldSort: true,
    includeMatches: true,
    threshold: 0.3,
    keys: [
      { name: "name", weight: 0.7 },
      { name: "description", weight: 0.3 },
    ],
  });

  const results = query.trim()
    ? fuse.search(query).map((r) => ({ shop: r.item }))
    : shops.map((s) => ({ shop: s }));

  console.log("Filtered results count:", results.length);
  return results;
};
