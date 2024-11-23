import { useEffect, useState, createContext, useContext } from "react";
import { ShopsProviderProps } from "../types/dataTypes";
import { cacheData, getCachedData } from "../services/indexedDB";
import {
  GetLocations,
  GetShops,
  ShopsContextType,
  ShopWithUser,
} from "../services/shopLoaction";
import { Location } from "../services/shopLoaction";
import { executeQuery } from "../services/apiClient";

const ShopsContext = createContext<ShopsContextType>({
  shops: [],
  locations: [],
  setShops: () => {},
  setLocations: () => {},
});

export const ShopsProvider = ({ children }: ShopsProviderProps) => {
  const [shops, setShops] = useState<ShopWithUser[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const cachedShops = await getCachedData("shops");
      const cachedLocations = await getCachedData("locations");

      const dbResult = await executeQuery<{ locationCount: number }>(
        `SELECT COUNT(*) as locationCount FROM locations`
      );
      const currentLocationCount = dbResult.rows[0]?.locationCount || 0;

      if (
        cachedLocations.length < currentLocationCount ||
        !cachedShops.length || 
        !cachedLocations.length
      ) {
        console.info(
          `Refreshing cache: ${cachedLocations.length} cached vs ${currentLocationCount} in database`
        );
        const fetchedShops = await GetShops();
        const fetchedLocations = await GetLocations();
        setShops(fetchedShops);
        setLocations(fetchedLocations);

        await cacheData("shops", fetchedShops);
        await cacheData("locations", fetchedLocations);
      } else {
        setShops(cachedShops as ShopWithUser[]);
        setLocations(cachedLocations);
      }
    };

    fetchData();
  }, []);

  return (
    <ShopsContext.Provider value={{ shops, locations, setShops, setLocations }}>
      {children}
    </ShopsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useShops = () => useContext(ShopsContext);
