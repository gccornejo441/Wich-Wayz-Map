import { useEffect, useState, createContext, useContext } from "react";
import { ShopsProviderProps } from "../types/dataTypes";
import { cacheData, getCachedData } from "../services/indexedDB";
import { executeQuery } from "../services/apiClient";
import { Location } from "@models/Location";
import { ShopWithUser } from "@models/ShopWithUser";
import { GetShops } from "@/services/shopService";

export interface ShopsContextType {
  shops: ShopWithUser[];
  locations: Location[];
  setShops: React.Dispatch<React.SetStateAction<ShopWithUser[]>>;
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
}

export const ShopsContext = createContext<ShopsContextType | null>(null);

export const ShopsProvider = ({ children }: ShopsProviderProps) => {
  const [shops, setShops] = useState<ShopWithUser[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedShops = await getCachedData("shops");
        const cachedLocations = await getCachedData("locations");

        const dbResult = await executeQuery<{ locationCount: number }>(
          `SELECT COUNT(*) as locationCount FROM locations`,
        );
        const currentLocationCount = dbResult.rows[0]?.locationCount || 0;

        if (
          cachedLocations.length < currentLocationCount ||
          !cachedShops.length ||
          !cachedLocations.length
        ) {
          console.info(
            "Refreshing cache: Fetching latest data from the database",
          );

          const fetchedShops = await GetShops();

          setShops(fetchedShops);

          const fetchedLocations = fetchedShops.flatMap(
            (shop) => shop.locations || [],
          );

          setLocations(fetchedLocations);

          await cacheData("shops", fetchedShops);
          await cacheData("locations", fetchedLocations);
        } else {
          setShops(cachedShops as ShopWithUser[]);
          setLocations(cachedLocations);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <ShopsContext.Provider
      value={{
        shops,
        locations,
        setShops,
        setLocations,
      }}
    >
      {children}
    </ShopsContext.Provider>
  );
};

export const useShops = () => {
  const context = useContext(ShopsContext);
  if (!context) {
    throw new Error("useShops must be used within a ShopsProvider");
  }
  return context;
};
