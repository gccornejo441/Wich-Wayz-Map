import { apiRequest } from "./apiClient";
import { cacheData } from "./indexedDB";
import { Shop } from "@/models/Shop";
import { AddAShopPayload } from "../types/dataTypes";
import { GetShops } from "./shopService";
import { ShopWithUser } from "@/models/ShopWithUser";

/**
 * Update a shop and its associated location in the database and cache.
 * @param shopId - The ID of the shop to update.
 * @param payload - The updated shop and location data.
 * @returns true if the update was successful, false otherwise.
 */
export const updateShop = async (
  shopId: number | string,
  payload: AddAShopPayload,
): Promise<ShopWithUser | null> => {
  try {
    await apiRequest(`/shops/${shopId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    const allShops = await GetShops();

    const allLocations = allShops.flatMap((shop) => shop.locations || []);
    await cacheData("shops", allShops as Shop[]);
    await cacheData("locations", allLocations);

    return allShops.find((s) => s.id === Number(shopId)) || null;
  } catch (error) {
    console.error("updateShop error:", error);
    return null;
  }
};
