import type { FuseResultMatch } from "fuse.js";
import { ShopFilters } from "@/types/shopFilter";
import {
  SHOPS_STORE,
  FILTERED_SHOPS_STORE,
  IndexedDBShop,
  cacheData,
  getCachedData,
} from "./indexedDB";
import {
  SearchEntry,
  ensureSearchIndex,
  getAllEntries,
  searchWithFuse,
} from "./searchIndex";
import { distanceMiles } from "@utils/geo";

export type ShopSearchHit = {
  shop: IndexedDBShop;
  location: NonNullable<IndexedDBShop["locations"]>[number];
  score?: number;
  matches?: ReadonlyArray<FuseResultMatch>;
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

export const filterEntries = (
  filters: ShopFilters,
  entries: SearchEntry[],
): SearchEntry[] => {
  return entries.filter((entry) => {
    if (!shopMatchesFilters(entry.shop, filters)) return false;
    if (!locationMatchesFilters(entry.location, filters)) return false;
    return true;
  });
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

const isWithinBounds = (
  lng: number,
  lat: number,
  bounds: [[number, number], [number, number]],
): boolean => {
  const [[west, south], [east, north]] = bounds;
  return lng >= west && lng <= east && lat >= south && lat <= north;
};

type GeoOptions = {
  center: [number, number];
  radiusKm?: number;
  weight?: number;
};

type ViewportOptions = {
  bounds: [[number, number], [number, number]];
  mode?: "restrict" | "boost";
};

type SearchOptions = {
  limit?: number;
  minQueryLength?: number;
  geo?: GeoOptions;
  viewport?: ViewportOptions;
};

type ScoredResult = {
  item: SearchEntry;
  score?: number;
  matches?: readonly FuseResultMatch[];
  finalScore: number;
  distance: number;
};

const scoreAndDedupeResults = (
  fuseResults: Array<{
    item: SearchEntry;
    score?: number;
    matches?: readonly FuseResultMatch[];
  }>,
  geoCenter: [number, number] | undefined,
  geoRadiusKm: number,
  geoWeight: number,
  viewportBounds: [[number, number], [number, number]] | undefined,
  viewportBoost: boolean,
): ScoredResult[] => {
  const scoredResults: ScoredResult[] = fuseResults.map((result) => {
    const fuseScore =
      typeof result.score === "number" && Number.isFinite(result.score)
        ? result.score
        : 1;

    let finalScore = fuseScore;
    const { latitude, longitude } = result.item.location;

    const hasValidCoords =
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

    let distance = Infinity;

    if (geoCenter && hasValidCoords) {
      const distMiles = distanceMiles(geoCenter, [longitude, latitude]);
      if (Number.isFinite(distMiles)) {
        const distKm = distMiles * 1.60934;
        distance = distKm;
        const distancePenalty = (distKm / geoRadiusKm) * geoWeight;
        finalScore += distancePenalty;
      }
    }

    if (viewportBoost && viewportBounds && hasValidCoords) {
      const inViewport = isWithinBounds(longitude, latitude, viewportBounds);
      if (inViewport) {
        finalScore -= 0.05;
      }
    }

    return {
      ...result,
      finalScore,
      distance,
    };
  });

  scoredResults.sort((a, b) => {
    if (a.finalScore !== b.finalScore) {
      return a.finalScore - b.finalScore;
    }
    if (
      geoCenter &&
      Number.isFinite(a.distance) &&
      Number.isFinite(b.distance)
    ) {
      return a.distance - b.distance;
    }
    return 0;
  });

  const shopMap = new Map<number, ScoredResult>();

  for (const result of scoredResults) {
    const shopId = result.item.shop.id;
    const existing = shopMap.get(shopId);

    if (!existing) {
      shopMap.set(shopId, result);
      continue;
    }

    if (result.finalScore < existing.finalScore) {
      shopMap.set(shopId, result);
      continue;
    }

    if (result.finalScore === existing.finalScore) {
      if (
        geoCenter &&
        Number.isFinite(result.distance) &&
        Number.isFinite(existing.distance) &&
        result.distance < existing.distance
      ) {
        shopMap.set(shopId, result);
      }
    }
  }

  const dedupedResults = Array.from(shopMap.values());

  dedupedResults.sort((a, b) => {
    if (a.finalScore !== b.finalScore) {
      return a.finalScore - b.finalScore;
    }
    if (
      geoCenter &&
      Number.isFinite(a.distance) &&
      Number.isFinite(b.distance)
    ) {
      return a.distance - b.distance;
    }
    return 0;
  });

  return dedupedResults;
};

export const SearchShops = async (
  query: string,
  filters?: ShopFilters,
  updateCache: boolean = false,
  options?: SearchOptions,
): Promise<ShopSearchHit[]> => {
  const limit = options?.limit ?? 10;
  const minQueryLength = options?.minQueryLength ?? 2;

  const q = normalize(query);
  if (q.length < minQueryLength) return [];

  await ensureSearchIndex();

  const allEntries = await getAllEntries();
  const totalEntries = allEntries.length;

  let filteringToSubset = false;
  let baseEntries: SearchEntry[] = allEntries;

  if (filters) {
    baseEntries = filterEntries(filters, allEntries);
    filteringToSubset = baseEntries.length < allEntries.length;

    if (updateCache) {
      const uniqueShops = Array.from(
        new Map(baseEntries.map((e) => [e.shop.id, e.shop])).values(),
      );
      await cacheData(FILTERED_SHOPS_STORE, uniqueShops);
    }
  }

  const candidateLimit = Math.min(Math.max(limit * 25, 200), totalEntries);

  let fuseResults = await searchWithFuse(q, candidateLimit);

  const viewportRestrict = options?.viewport?.mode === "restrict";
  const needsFiltering = filteringToSubset || viewportRestrict;

  if (needsFiltering) {
    const baseEntrySet = filteringToSubset ? new Set(baseEntries) : null;

    fuseResults = fuseResults.filter((result) => {
      if (baseEntrySet && !baseEntrySet.has(result.item)) {
        return false;
      }

      if (viewportRestrict) {
        const { latitude, longitude } = result.item.location;
        if (
          typeof latitude !== "number" ||
          typeof longitude !== "number" ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return false;
        }
        if (!isWithinBounds(longitude, latitude, options.viewport!.bounds)) {
          return false;
        }
      }

      return true;
    });
  }

  const geoCenter = options?.geo?.center;
  let geoRadiusKm = options?.geo?.radiusKm ?? 25;
  let geoWeight = options?.geo?.weight ?? 0.15;

  if (
    typeof geoRadiusKm !== "number" ||
    !Number.isFinite(geoRadiusKm) ||
    geoRadiusKm <= 0
  ) {
    geoRadiusKm = 25;
  }

  if (
    typeof geoWeight !== "number" ||
    !Number.isFinite(geoWeight) ||
    geoWeight < 0
  ) {
    geoWeight = 0.15;
  }

  const viewportBounds = options?.viewport?.bounds;
  const viewportBoost = options?.viewport?.mode === "boost";

  let dedupedResults = scoreAndDedupeResults(
    fuseResults,
    geoCenter,
    geoRadiusKm,
    geoWeight,
    viewportBounds,
    viewportBoost,
  );

  if (dedupedResults.length < limit && filteringToSubset) {
    const secondPassLimit = Math.min(
      Math.max(limit * 200, candidateLimit * 4),
      totalEntries,
    );

    if (secondPassLimit > candidateLimit) {
      const secondPassResults = await searchWithFuse(q, secondPassLimit);

      const baseEntrySet = new Set(baseEntries);

      const filteredSecondPass = secondPassResults.filter((result) => {
        if (!baseEntrySet.has(result.item)) {
          return false;
        }

        if (viewportRestrict) {
          const { latitude, longitude } = result.item.location;
          if (
            typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return false;
          }
          if (!isWithinBounds(longitude, latitude, options.viewport!.bounds)) {
            return false;
          }
        }

        return true;
      });

      dedupedResults = scoreAndDedupeResults(
        filteredSecondPass,
        geoCenter,
        geoRadiusKm,
        geoWeight,
        viewportBounds,
        viewportBoost,
      );
    }
  }

  return dedupedResults.slice(0, limit).map((result) => ({
    shop: result.item.shop,
    location: result.item.location,
    score: result.finalScore,
    matches: result.matches,
  }));
};
