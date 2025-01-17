import { ShopWithUser } from "@/models/ShopWithUser";
import { executeQuery } from "./apiClient";

/**
 * Retrieves all shops from the database, including their associated users, locations, and categories.
 *
 * @returns {Promise<ShopWithUser[]>} A list of shops with their related information.
 * @throws An error if the fetch fails.
 */
export const GetShops = async (): Promise<ShopWithUser[]> => {
  try {
    const shopsQuery = `
      SELECT 
        shops.id AS shop_id,
        shops.name AS shop_name,
        shops.description,
        shops.modified_by,
        shops.created_by,
        users.username AS created_by_username,
        users.avatar AS users_avatar_id,
        shops.date_created,
        shops.date_modified,
        locations.id AS location_id,
        locations.postal_code,
        locations.latitude,
        locations.longitude,
        locations.street_address,
        locations.street_address_second,
        locations.city,
        locations.state,
        locations.country,
        categories.id AS category_id,
        categories.category_name
      FROM shops
      LEFT JOIN users ON shops.created_by = users.id
      LEFT JOIN shop_locations ON shops.id = shop_locations.shop_id
      LEFT JOIN locations ON shop_locations.location_id = locations.id
      LEFT JOIN shop_categories ON shops.id = shop_categories.shop_id
      LEFT JOIN categories ON shop_categories.category_id = categories.id;
    `;

    const { rows: shopData } = await executeQuery<{
      shop_id: number;
      shop_name: string;
      description: string | null;
      modified_by: number | null;
      created_by: number;
      created_by_username: string | null;
      users_avatar_id: string | null;
      date_created: string;
      date_modified: string | null;
      location_id: number | null;
      postal_code: string | null;
      latitude: number | null;
      longitude: number | null;
      street_address: string | null;
      street_address_second: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      category_id: number | null;
      category_name: string | null;
    }>(shopsQuery);

    const shopMap: Record<number, ShopWithUser> = {};

    for (const row of shopData) {
      if (!shopMap[row.shop_id]) {
        shopMap[row.shop_id] = {
          id: row.shop_id,
          name: row.shop_name,
          description: row.description || undefined,
          modified_by: row.modified_by || undefined,
          created_by: row.created_by,
          created_by_username: row.created_by_username || "admin",
          users_avatar_id: row.users_avatar_id || undefined,
          date_created: row.date_created,
          date_modified: row.date_modified || undefined,
          locations: [],
          categories: [],
        };
      }

      if (row.location_id) {
        const locationExists = shopMap[row.shop_id].locations?.some(
          (loc) => loc.id === row.location_id,
        );
        if (!locationExists) {
          shopMap[row.shop_id].locations?.push({
            id: row.location_id,
            postal_code: row.postal_code || "",
            latitude: row.latitude || 0,
            longitude: row.longitude || 0,
            street_address: row.street_address || "",
            street_address_second: row.street_address_second || null,
            city: row.city || "",
            state: row.state || "",
            country: row.country || "",
            modified_by: undefined,
            date_created: undefined,
            date_modified: undefined,
          });
        }
      }

      if (row.category_id) {
        const categoryExists = shopMap[row.shop_id].categories?.some(
          (cat) => cat.id === row.category_id,
        );
        if (!categoryExists) {
          shopMap[row.shop_id].categories?.push({
            id: row.category_id,
            category_name: row.category_name || "Unknown",
          });
        }
      }
    }

    return Object.values(shopMap);
  } catch (error) {
    console.error("Error fetching shops:", error);
    throw new Error("Failed to fetch shops.");
  }
};
