import { useEffect, useState, useMemo, createContext, useContext } from "react";
import { ShopsProviderProps } from "../types/dataTypes";
import {
  cacheData,
  getCachedData,
  SHOPS_STORE,
  LOCATIONS_STORE,
} from "@/services/indexedDB";
import { executeQuery } from "@/services/apiClient";
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
  updateShopInContext: (shop: ShopWithUser) => void;
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
          const storedFiltered = sessionStorage.getItem(FILTERED_SHOPS_KEY);
          if (storedFiltered) {
            setFiltered(JSON.parse(storedFiltered));
          }
        }

        const cachedShops = await getCachedData(SHOPS_STORE);
        const cachedLocations = await getCachedData(LOCATIONS_STORE);

        const [{ rows }] = await Promise.all([
          executeQuery<{ count: number }>(
            "SELECT COUNT(*) AS count FROM locations",
          ),
        ]);
        const dbLocationCount = rows[0]?.count ?? 0;

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
    setShops((prev) => {
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      cacheData(SHOPS_STORE, next);
      return next;
    });
    setFiltered((prev) => {
      if (!prev.length) return prev;
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      sessionStorage.setItem(FILTERED_SHOPS_KEY, JSON.stringify(next));
      return next;
    });
    setLocations((prev) => {
      const map = new Map((updated.locations ?? []).map((l) => [l.id, l]));
      const next = prev.map((l) => map.get(l.id) ?? l);
      cacheData(LOCATIONS_STORE, next);
      return next;
    });
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
