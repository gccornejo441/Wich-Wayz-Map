import { useShops } from "@/context/shopContext";
import { cacheData, getCachedData } from "./indexedDB";
import { Shop } from "@/models/Shop";
import { Location } from "@models/Location";

/**
 * Updates local state and caches locations.
 */
export function updateLocations(
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>,
  insertedLocations: Location[],
): void {
  setLocations((prevLocations) => {
    const updatedLocations = [...prevLocations, ...insertedLocations];
    cacheData("locations", updatedLocations);
    return updatedLocations;
  });
}

/**
 * Updates local state and caches shops.
 */
export function updateShops(
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>,
  newShop: Shop,
): void {
  setShops((prevShops) => {
    const updatedShops = [...prevShops, newShop];
    cacheData("shops", updatedShops);
    return updatedShops;
  });
}

/**
 * Custom hook to update shop categories in local state and IndexedDB cache.
 *
 * Provides a function to save updated categories for a specific shop by
 * updating the local cache and state. If the shop is not found in the cache,
 * an error is logged. Any errors during the process will be thrown after
 * logging.
 *
 * @returns {Object} An object containing the `SaveUpdatedShopCategories` function.
 */
export const useUpdateShopCategories = () => {
  const { setShops } = useShops();

  const SaveUpdatedShopCategories = async (
    shopId: number,
    updatedCategories: { id: number; category_name: string }[],
  ): Promise<void> => {
    try {
      const cachedShops = await getCachedData("shops");

      const shopIndex = cachedShops.findIndex((shop) => shop.id === shopId);
      if (shopIndex === -1) {
        console.error(`Shop with ID ${shopId} not found in cache.`);
        return;
      }

      const updatedShop = { ...cachedShops[shopIndex] };
      updatedShop.categories = updatedCategories;

      cachedShops[shopIndex] = updatedShop;

      await cacheData("shops", cachedShops);

      setShops([...cachedShops]);
    } catch (error) {
      console.error("Failed to update shop categories in IndexedDB:", error);
      throw error;
    }
  };

  return { SaveUpdatedShopCategories };
};
