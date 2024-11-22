import { useEffect, useState, createContext, useContext } from "react";
import { ShopsProviderProps } from "../types/dataTypes";
import { cacheData, getCachedData } from "../services/indexedDB";
import {
  GetLocations,
  GetShops,
  ShopsContextType,
  ShopWithUser,
} from "../services/api";
import { Location } from "./../services/api";

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
      if (cachedShops.length && cachedLocations.length) {
        setShops(cachedShops as ShopWithUser[]);
        setLocations(cachedLocations);
      } else {
        const fetchedShops = await GetShops();
        const fetchedLocations = await GetLocations();
        setShops(fetchedShops);
        setLocations(fetchedLocations);

        await cacheData("shops", fetchedShops);
        await cacheData("locations", fetchedLocations);
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
