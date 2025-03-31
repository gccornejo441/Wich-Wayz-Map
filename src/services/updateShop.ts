import { executeQuery, updateShopCategories } from "./apiClient";
import { cacheData, getCachedData } from "./indexedDB";
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
  payload: AddAShopPayload
): Promise<ShopWithUser | null> => {
  try {
    // Update the shops table
    await updateShopsTable(shopId, payload);

    // Update categories
    if (payload.categoryIds?.length) {
      await updateShopCategories(Number(shopId), payload.categoryIds);
    }

    // Update location
    const locationId = await getLocationIdForShop(shopId);
    if (!locationId) {
      console.error(`No location_id found for shop_id = ${shopId}`);
      return null;
    }

    await updateLocationsTable(locationId, payload);

    // Update local cache (optional if you'll replace context instead)
    await updateCachedShops(shopId, payload);

    // ✅ Return updated shop object
    const allShops = await GetShops();
    return allShops.find((s) => s.id === Number(shopId)) || null;

  } catch (error) {
    console.error("updateShop error:", error);
    return null;
  }
};

/**
 * Update the shops table with the provided data.
 * @param shopId - The ID of the shop to update.
 * @param payload - The updated shop data.
 */
async function updateShopsTable(
  shopId: number | string,
  { shopName, shop_description }: AddAShopPayload
) {
  const query = `
    UPDATE shops
    SET 
      name = ?,
      description = ?
    WHERE id = ?;
  `;
  await executeQuery(query, [shopName ?? "", shop_description ?? "", shopId]);
}

interface LocationIdRow {
  location_id: number;
}

/**
 * Retrieves the location ID associated with a given shop ID.
 *
 * @param shopId - The ID of the shop, which can be a number or a string.
 * @returns A promise that resolves to the location ID as a number if found,
 *          or `null` if no location is associated with the given shop ID.
 *
 * @throws May throw an error if the database query fails.
 */
async function getLocationIdForShop(
  shopId: number | string
): Promise<number | null> {
  const query = `
    SELECT location_id
    FROM shop_locations
    WHERE shop_id = ?;
  `;
  const result = await executeQuery<LocationIdRow>(query, [shopId]);

  if (!result.rows || result.rows.length === 0) {
    return null;
  }

  return result.rows[0].location_id;
}

/**
 * Updates the locations table with the provided data.
 * @param locationId - The ID of the location to update.
 * @param payload - The updated location data.
 */
async function updateLocationsTable(
  locationId: number,
  payload: AddAShopPayload
) {
  const {
    house_number,
    address_first,
    address_second,
    postcode,
    city,
    state,
    country,
    latitude,
    longitude,
    phone,
    website_url,
  } = payload;

  const streetAddress = house_number
    ? `${house_number} ${address_first}`
    : (address_first ?? "");

  const query = `
    UPDATE locations
    SET 
      street_address = ?,
      street_address_second = ?,
      postal_code = ?,
      city = ?,
      state = ?,
      country = ?,
      latitude = ?,
      longitude = ?,
      phone = ?,
      website_url = ?,
      date_modified = CURRENT_TIMESTAMP
    WHERE id = ?;
  `;

  await executeQuery(query, [
    streetAddress,
    address_second ?? "",
    postcode?.trim() || "",
    city ?? "",
    state ?? "",
    country ?? "",
    latitude ?? 0,
    longitude ?? 0,
    phone ?? "",
    website_url ?? "",
    locationId,
  ]);
}

/**
 * Updates the cached shops data in IndexedDB.
 * @param shopId - The ID of the shop to update.
 * @param payload - The updated shop data.
 * @returns A promise that resolves when the cache is updated.
 * @throws Will throw an error if the cache update fails.
 */
async function updateCachedShops(
  shopId: number | string,
  payload: AddAShopPayload
) {
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
}
