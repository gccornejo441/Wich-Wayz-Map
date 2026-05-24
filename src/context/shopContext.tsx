import { useEffect, useState, useMemo, createContext, useContext } from "react";
import { ShopsProviderProps } from "../types/dataTypes";
import {
  cacheData,
  getCachedData,
  SHOPS_STORE,
  LOCATIONS_STORE,
} from "@/services/indexedDB";
import { invalidateSearchIndex } from "@/services/searchIndex";
import { getLocationCount } from "@/services/apiClient";
import { Location } from "@models/Location";
import { ShopWithUser } from "@models/ShopWithUser";
import { GetShops } from "@/services/shopService";

export interface ShopsContextType {
  shops: ShopWithUser[];
  filtered: ShopWithUser[];
  displayedShops: ShopWithUser[];
  locations: Location[];

  setShops: React.Dispatch<React.SetStateAction<ShopWithUser[]>>;
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;

  applyFilters: (next: ShopWithUser[]) => Promise<void>;
  clearFilters: () => Promise<void>;
  updateShopInContext: (shop: ShopWithUser) => Promise<void>;
  removeShopFromContext: (shopId: number) => void;
  refreshShops: () => Promise<void>;
}

const FILTERED_SHOPS_KEY = "filtered_shops";

export const ShopsContext = createContext<ShopsContextType | null>(null);

export const ShopsProvider = ({ children }: ShopsProviderProps) => {
  const [shops, setShops] = useState<ShopWithUser[]>([]);
  const [filtered, setFiltered] = useState<ShopWithUser[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const displayedShops = useMemo(
    () => (filtered.length ? filtered : shops),
    [filtered, shops],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const navEntry = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        const isFreshLoad = navEntry?.type === "reload";

        if (isFreshLoad) {
          sessionStorage.removeItem(FILTERED_SHOPS_KEY);
          setFiltered([]);
        } else {
          const storedFiltered = sessionStorage.thegetItem(FILTERED_SHOPS_KEY);
          if (storedFiltered) {
            setFiltered(JSON.parse(storedFiltered));
          }
        }

        const cachedShops = await getCachedData(SHOPS_STORE);
        const cachedLocations = await getCachedData(LOCATIONS_STORE);

        const dbLocationCount = await getLocationCount();

        const cacheIsValid =
          cachedShops.length &&
          cachedLocations.length &&
          cachedLocations.length >= dbLocationCount;

        if (cacheIsValid) {
          setShops(cachedShops as ShopWithUser[]);
          setLocations(cachedLocations as Location[]);
        } else {
          const freshShops = await GetShops();
          const freshLocs = freshShops.flatMap((s) => s.locations || []);

          setShops(freshShops);
          setLocations(freshLocs);

          await cacheData(SHOPS_STORE, freshShops);
          await cacheData(LOCATIONS_STORE, freshLocs);
        }
      } catch (err) {
        console.error("ShopContext load error:", err);
      }
    };
    load();
  }, []);

  const applyFilters = async (next: ShopWithUser[]) => {
    setFiltered(next);
    sessionStorage.setItem(FILTERED_SHOPS_KEY, JSON.stringify(next));
  };

  const clearFilters = async () => {
    setFiltered([]);
    sessionStorage.removeItem(FILTERED_SHOPS_KEY);
  };

  const updateShopInContext = async (updated: ShopWithUser) => {
    // Compute next state outside of updaters so cache writes can be awaited.
    let nextShops: ShopWithUser[] = [];
    let nextLocations: Location[] = [];

    setShops((prev) => {
      nextShops = prev.map((s) => (s.id === updated.id ? updated : s));
      return nextShops;
    });

    setFiltered((prev) => {
      if (!prev.length) return prev;
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      sessionStorage.setItem(FILTERED_SHOPS_KEY, JSON.stringify(next));
      return next;
    });

    setLocations((prev) => {
      const map = new Map((updated.locations ?? []).map((l) => [l.id, l]));
      nextLocations = prev.map((l) => map.get(l.id) ?? l);
      return nextLocations;
    });

    // Persist to cache after state is updated — errors are logged, not swallowed.
    await Promise.all([
      cacheData(SHOPS_STORE, nextShops).catch((err) =>
        console.error("Failed to cache shops after update:", err),
      ),
      cacheData(LOCATIONS_STORE, nextLocations).catch((err) =>
        console.error("Failed to cache locations after update:", err),
      ),
    ]);

    // Invalidate the search index so updated shops appear correctly in search
    invalidateSearchIndex();
  };

  const removeShopFromContext = (shopId: number) => {
    let nextShops: ShopWithUser[] = [];

    setShops((prev) => {
      nextShops = prev.filter((s) => s.id !== shopId);
      return nextShops;
    });

    setFiltered((prev) => {
      if (!prev.length) return prev;
      const next = prev.filter((s) => s.id !== shopId);
      sessionStorage.setItem(FILTERED_SHOPS_KEY, JSON.stringify(next));
      return next;
    });

    // Persist to cache — errors are logged, not swallowed.
    cacheData(SHOPS_STORE, nextShops).catch((err) =>
      console.error("Failed to cache shops after removal:", err),
    );

    // Invalidate the search index so removed shops don't appear in search
    invalidateSearchIndex();
  };

  const refreshShops = async () => {
    try {
      // Fetch fresh data from API
      const freshShops = await GetShops();
      const freshLocs = freshShops.flatMap((s) => s.locations || []);

      // Update state
      setShops(freshShops);
      setLocations(freshLocs);

      // Update cache
      await cacheData(SHOPS_STORE, freshShops);
      await cacheData(LOCATIONS_STORE, freshLocs);

      // Invalidate search index
      invalidateSearchIndex();

      // Clear any filtered state to show all shops
      setFiltered([]);
      sessionStorage.removeItem(FILTERED_SHOPS_KEY);
    } catch (error) {
      console.error("Failed to refresh shops:", error);
      throw error;
    }
  };

  return (
    <ShopsContext.Provider
      value={{
        shops,
        filtered,
        displayedShops,
        locations,
        setShops,
        setLocations,
        applyFilters,
        clearFilters,
        updateShopInContext,
        removeShopFromContext,
        refreshShops,
      }}
    >
      {children}
    </ShopsContext.Provider>
  );
};

export const useShops = () => {
  const ctx = useContext(ShopsContext);
  if (!ctx) throw new Error("useShops must be used within a ShopsProvider");
  return ctx;
};
