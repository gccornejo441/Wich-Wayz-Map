import { executeQuery, updateShopCategories } from "./apiClient";
import { cacheData, getCachedData } from "./indexedDB";
import { Shop } from "@/models/Shop";

export interface LocationData {
  shopName: string;
  address?: string;
  website_url?: string;
  phone?: string;
  address_first?: string;
  address_second?: string;
  house_number?: string;
  city?: string;
  state?: string;
  postcode: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface AddAShopPayload extends LocationData {
  shop_description: string;
  categoryIds: number[];
}

/**
 * Update a shop in the database and cache
 * @param shopId - The ID of the shop to update
 * @param payload - The updated shop data
 * @returns true if the update was successful, false otherwise
 */
export const updateShop = async (
  shopId: number | string,
  payload: AddAShopPayload,
): Promise<boolean> => {
  try {
    const {
      shopName,
      shop_description,
      address,
      website_url,
      phone,
      address_first,
      address_second,
      house_number,
      city,
      state,
      postcode,
      country,
      latitude,
      longitude,
      categoryIds,
    } = payload;

    const updateQuery = `
      UPDATE shops
      SET 
        name = ?,
        description = ?,
        address = ?,
        website_url = ?,
        phone = ?,
        address_first = ?,
        address_second = ?,
        house_number = ?,
        city = ?,
        state = ?,
        postcode = ?,
        country = ?,
        latitude = ?,
        longitude = ?
      WHERE id = ?;
    `;

    await executeQuery(updateQuery, [
      shopName ?? "",
      shop_description ?? "",
      address ?? "",
      website_url ?? "",
      phone ?? "",
      address_first ?? "",
      address_second ?? "",
      house_number ?? "",
      city ?? "",
      state ?? "",
      postcode ?? "",
      country ?? "",
      latitude ?? 0,
      longitude ?? 0,
      shopId,
    ]);

    if (categoryIds && categoryIds.length > 0) {
      await updateShopCategories(Number(shopId), categoryIds);
    }

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
