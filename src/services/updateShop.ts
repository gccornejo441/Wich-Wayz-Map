import { cacheData, getCachedData } from "./indexedDB";
import { Shop } from "@/models/Shop";
import { AddAShopPayload } from "@/types/dataTypes";

/**
 * Updates a shop's data via API and reflects changes in local cache and state.
 */
export const updateShop = async (
  shopId: number | string,
  payload: AddAShopPayload,
): Promise<boolean> => {
  try {
    // 1. Send to backend
    const response = await fetch(`/api/shops/${shopId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Failed to update shop via API");
      return false;
    }

    // 2. Update cache
    const cachedShops: Shop[] = await getCachedData("shops");
    const shopIndex = cachedShops.findIndex((shop) => shop.id === shopId);

    if (shopIndex !== -1) {
      const updatedShop: Shop = {
        ...cachedShops[shopIndex],
        ...payload,
      };

      cachedShops[shopIndex] = updatedShop;
      await cacheData("shops", cachedShops);
    }

    return true;
  } catch (error) {
    console.error("updateShop error:", error);
    return false;
  }
};
