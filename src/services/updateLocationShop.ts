import { useShops } from "@/context/shopContext";
import { updateData } from "./apiClient";
import { cacheData, getCachedData } from "./indexedDB";
import { Shop } from "@/models/Shop";

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
 * Updates a shop's basic information in the database.
 */
export const updateShopInfo = async (
  shopId: number,
  updates: Record<string, string | number | null>,
): Promise<void> => {
  await updateData("shops", updates, "id = ?", [shopId]);
};

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
