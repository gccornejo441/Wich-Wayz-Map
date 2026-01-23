import Fuse from "fuse.js";
import type { FuseResultMatch } from "fuse.js";
import { ShopFilters } from "@/types/shopFilter";
import {
  SHOPS_STORE,
  FILTERED_SHOPS_STORE,
  IndexedDBShop,
  cacheData,
  getCachedData,
} from "./indexedDB";

export type ShopSearchHit = {
  shop: IndexedDBShop;
  location: NonNullable<IndexedDBShop["locations"]>[number];
  score?: number;
  matches?: ReadonlyArray<FuseResultMatch>;
};

type SearchEntry = {
  shop: IndexedDBShop;
  location: NonNullable<IndexedDBShop["locations"]>[number];
  name: string;
  description: string;
  categories: string;
  fullAddress: string;
  nameSearch: string;
  descriptionSearch: string;
  categoriesSearch: string;
  fullAddressSearch: string;
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const includesNorm = (
  haystack: string | undefined | null,
  needle: string | undefined | null,
) => {
  if (!needle) return true;
  const n = normalize(needle);
  if (!n) return true;
  return normalize(haystack ?? "").includes(n);
};

const shopMatchesFilters = (shop: IndexedDBShop, filters: ShopFilters) => {
  const { categoryIds } = filters;

  if (categoryIds && categoryIds.length > 0) {
    const ids = (shop.categories ?? []).map((c) => c.id);
    if (!ids.some((id) => categoryIds.includes(id))) return false;
  }

  return true;
};

const locationMatchesFilters = (
  loc: NonNullable<IndexedDBShop["locations"]>[number],
  filters: ShopFilters,
) => {
  const { city, state, country, locationOpen } = filters;

  if (!includesNorm(loc.city, city)) return false;
  if (!includesNorm(loc.state, state)) return false;
  if (!includesNorm(loc.country, country)) return false;

  if (locationOpen === true && loc.location_open === false) return false;

  return true;
};

export const FilterShops = async (
  filters: ShopFilters,
  updateCache: boolean = false,
): Promise<IndexedDBShop[]> => {
  const shops: IndexedDBShop[] = await getCachedData(SHOPS_STORE);

  const filtered = shops.filter((shop) => {
    if (!shopMatchesFilters(shop, filters)) return false;

    const locs = shop.locations ?? [];
    if (locs.length === 0) return false;

    return locs.some((loc) => locationMatchesFilters(loc, filters));
  });

  if (updateCache) {
    await cacheData(FILTERED_SHOPS_STORE, filtered);
  }

  return filtered;
};

export const SearchShops = async (
  query: string,
  filters?: ShopFilters,
  updateCache: boolean = false,
  options?: { limit?: number; minQueryLength?: number },
): Promise<ShopSearchHit[]> => {
  const limit = options?.limit ?? 10;
  const minQueryLength = options?.minQueryLength ?? 2;

  const q = normalize(query);
  if (q.length < minQueryLength) return [];

  let baseShops: IndexedDBShop[];

  if (filters) {
    baseShops = await FilterShops(filters, updateCache);
  } else {
    const filtered = await getCachedData(FILTERED_SHOPS_STORE);
    baseShops =
      filtered.length > 0 ? filtered : await getCachedData(SHOPS_STORE);
  }

  const entries: SearchEntry[] = [];

  for (const shop of baseShops) {
    const locs = shop.locations ?? [];
    const categories = (shop.categories ?? [])
      .map((c) => c.category_name)
      .filter(Boolean)
      .join(" ");

    for (const loc of locs) {
      if (filters && !locationMatchesFilters(loc, filters)) continue;

      const street = [loc.street_address, loc.street_address_second]
        .filter(Boolean)
        .join(" ");

      const fullAddress = [street, loc.city, loc.state, loc.postal_code]
        .filter(Boolean)
        .join(", ");

      const name = shop.name ?? "";
      const description = shop.description ?? "";

      entries.push({
        shop,
        location: loc,
        name,
        description,
        categories,
        fullAddress,
        nameSearch: normalize(name),
        descriptionSearch: normalize(description),
        categoriesSearch: normalize(categories),
        fullAddressSearch: normalize(fullAddress),
      });
    }
  }

  const fuse = new Fuse(entries, {
    shouldSort: true,
    includeMatches: true,
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: minQueryLength,
    keys: [
      { name: "nameSearch", weight: 0.55 },
      { name: "categoriesSearch", weight: 0.2 },
      { name: "fullAddressSearch", weight: 0.15 },
      { name: "descriptionSearch", weight: 0.1 },
    ],
  });

  return fuse
    .search(q)
    .slice(0, limit)
    .map((r) => ({
      shop: r.item.shop,
      location: r.item.location,
      score: r.score,
      matches: r.matches,
    }));
};
