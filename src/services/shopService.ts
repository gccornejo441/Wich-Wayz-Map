import { ShopWithUser } from "@/models/ShopWithUser";
import { apiRequest } from "./apiClient";
import { ShopGeoJsonProperties } from "@/components/Map/MapBox";

/**
 * Retrieves all shops from the database, including their associated users, locations, and categories.
 *
 * @returns {Promise<ShopWithUser[]>} A list of shops with their related information.
 * @throws An error if the fetch fails.
 */
export const GetShops = async (): Promise<ShopWithUser[]> => {
  try {
    const shops = await apiRequest<ShopWithUser[]>("/shops");
    return shops;
  } catch (error) {
    console.error("Error fetching shops:", error);
    throw new Error("Failed to fetch shops.");
  }
};

/**
 * Retrieves a single shop by ID with full details including coordinates.
 *
 * @param {number} shopId - The ID of the shop to fetch.
 * @returns {Promise<ShopGeoJsonProperties>} Shop data formatted for sidebar display.
 * @throws An error if the fetch fails or shop not found.
 */
export const fetchShopById = async (
  shopId: number,
): Promise<ShopGeoJsonProperties> => {
  try {
    const shops = await apiRequest<ShopWithUser[]>("/shops");
    const shop = shops.find((s) => s.id === shopId);

    if (!shop) {
      throw new Error(`Shop with ID ${shopId} not found`);
    }

    // Get the first location (primary location)
    const location = shop.locations?.[0];
    if (!location) {
      throw new Error(`Shop with ID ${shopId} has no location data`);
    }

    // Build address string
    const addressParts = [
      location.street_address,
      location.street_address_second,
      location.city,
      location.state,
      location.postal_code,
    ].filter((part) => part && part.trim().length > 0);
    const address = addressParts.join(", ");

    // Build categories string
    const categories =
      shop.categories?.map((cat) => cat.category_name).join(", ") || "";

    // Build category IDs array
    const categoryIds =
      shop.categories
        ?.map((cat) => cat.id)
        .filter((id): id is number => typeof id === "number") || [];

    // Return shop in ShopGeoJsonProperties format
    return {
      shopId: shop.id!,
      shopName: shop.name,
      categories,
      categoryIds,
      description: shop.description || undefined,
      address,
      city: location.city,
      state: location.state,
      postalCode: location.postal_code,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      phone: location.phone || undefined,
      website: location.website || undefined,
      website_url: location.website || undefined,
      createdBy: shop.created_by_username || undefined,
      usersAvatarId: shop.users_avatar_id || undefined,
      usersAvatarEmail:
        (shop as { users_avatar_email?: string }).users_avatar_email ||
        undefined,
      locationOpen: location.location_open,
    };
  } catch (error) {
    console.error("Error fetching shop by ID:", error);
    throw new Error("Failed to fetch shop details.");
  }
};
