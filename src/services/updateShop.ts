import { apiRequest } from "./apiClient";
import { cacheData } from "./indexedDB";
import { invalidateSearchIndex } from "./searchIndex";
import { Shop } from "@/models/Shop";
import { AddAShopPayload } from "@/types/dataTypes";
import { AddressDraft } from "@/types/address";
import { GetShops } from "./shopService";
import { ShopWithUser } from "@/models/ShopWithUser";

/**
 * Update a shop and its associated location in the database and cache.
 * @param shopId - The ID of the shop to update.
 * @param payload - The updated shop and location data.
 * @param address - Optional structured address object.
 * @returns Updated shop or null if failed.
 */
export const updateShop = async (
  shopId: number | string,
  payload: AddAShopPayload,
  address?: AddressDraft,
): Promise<ShopWithUser | null> => {
  try {
    // If address is provided, merge it into the payload
    const updatePayload = { ...payload };

    if (address) {
      // Use structured address fields - maps to schema
      // streetAddress → street_address (via address_first)
      // streetAddressSecond → street_address_second (via address_second)
      updatePayload.address_first = address.streetAddress;
      updatePayload.address_second = address.streetAddressSecond;
      updatePayload.city = address.city;
      updatePayload.state = address.state;
      updatePayload.postcode = address.postalCode;
      updatePayload.country = address.country;
      updatePayload.latitude = address.latitude ?? 0;
      updatePayload.longitude = address.longitude ?? 0;
    }

    await apiRequest(`/shops/${shopId}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });

    const allShops = await GetShops();

    const allLocations = allShops.flatMap((shop) => shop.locations || []);
    await cacheData("shops", allShops as Shop[]);
    await cacheData("locations", allLocations);

    // Invalidate the search index so updated shops appear correctly in search
    invalidateSearchIndex();

    return allShops.find((s) => s.id === Number(shopId)) || null;
  } catch (error) {
    console.error("updateShop error:", error);
    return null;
  }
};
