import Fuse from "fuse.js";
import type { FuseResult } from "fuse.js";
import {
  SHOPS_STORE,
  IndexedDBShop,
  getCachedData,
} from "./indexedDB";

export type SearchEntry = {
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

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

let cachedEntries: SearchEntry[] | null = null;
let cachedFuseInstance: Fuse<SearchEntry> | null = null;

const buildSearchEntries = (shops: IndexedDBShop[]): SearchEntry[] => {
  const entries: SearchEntry[] = [];

  for (const shop of shops) {
    const locs = shop.locations ?? [];
    const categories = (shop.categories ?? [])
      .map((c) => c.category_name)
      .filter(Boolean)
      .join(" ");

    for (const loc of locs) {
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

  return entries;
};

const createFuseInstance = (entries: SearchEntry[]): Fuse<SearchEntry> => {
  return new Fuse(entries, {
    shouldSort: true,
    includeMatches: true,
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: "nameSearch", weight: 0.55 },
      { name: "categoriesSearch", weight: 0.2 },
      { name: "fullAddressSearch", weight: 0.15 },
      { name: "descriptionSearch", weight: 0.1 },
    ],
  });
};

export const ensureSearchIndex = async (force: boolean = false): Promise<void> => {
  if (force || cachedEntries === null || cachedFuseInstance === null) {
    const shops: IndexedDBShop[] = await getCachedData(SHOPS_STORE);
    cachedEntries = buildSearchEntries(shops);
    cachedFuseInstance = createFuseInstance(cachedEntries);
  }
};

export const getAllEntries = async (): Promise<SearchEntry[]> => {
  await ensureSearchIndex();
  return cachedEntries ?? [];
};

export const searchWithFuse = async (
  query: string,
  limit: number = 10,
): Promise<FuseResult<SearchEntry>[]> => {
  await ensureSearchIndex();
  
  if (!cachedFuseInstance) {
    return [];
  }

  const normalizedQuery = normalize(query);
  return cachedFuseInstance.search(normalizedQuery, { limit });
};

export const invalidateSearchIndex = (): void => {
  cachedEntries = null;
  cachedFuseInstance = null;
};