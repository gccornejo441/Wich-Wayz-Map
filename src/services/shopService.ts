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
        s.id AS shop_id,
        s.name AS shop_name,
        s.description,
        s.modified_by,
        s.created_by,
        u.username AS created_by_username,
        u.avatar AS users_avatar_id,
        s.date_created,
        s.date_modified,
        s.id_location,
        l.postal_code,
        l.latitude,
        l.longitude,
        l.modified_by AS location_modified_by,
        l.date_created AS location_date_created,
        l.date_modified AS location_date_modified,
        l.street_address,
        l.street_address_second,
        l.city,
        l.state,
        l.country,
        l.location_open,
        l.phone,
        l.website_url,
        c.id AS category_id,
        c.category_name
      FROM shops s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN shop_categories sc ON s.id = sc.shop_id
      LEFT JOIN categories c ON sc.category_id = c.id
      LEFT JOIN locations l ON s.id_location = l.id;
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
      id_location: number | null;
      postal_code: string | null;
      latitude: number | null;
      longitude: number | null;
      location_modified_by: number | null;
      location_date_created: string | null;
      location_date_modified: string | null;
      street_address: string | null;
      street_address_second: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      location_open: string | null;
      phone: string | null;
      website_url: string | null;
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

        if (row.id_location) {
          shopMap[row.shop_id].locations!.push({
            id: row.id_location,
            postal_code: row.postal_code || "",
            latitude: row.latitude || 0,
            longitude: row.longitude || 0,
            modified_by: row.location_modified_by || undefined,
            date_created: row.location_date_created || undefined,
            date_modified: row.location_date_modified || undefined,
            street_address: row.street_address || "",
            street_address_second: row.street_address_second || "",
            city: row.city || "",
            state: row.state || "",
            country: row.country || "",
            location_open: row.location_open
              ? row.location_open === "true"
              : undefined,
            phone: row.phone || null,
            website: row.website_url || null,
          });
        }
      }

      if (row.category_id) {
        const shopEntry = shopMap[row.shop_id]!;
        const categoryExists = shopEntry.categories!.some(
          (cat) => cat.id === row.category_id,
        );
        if (!categoryExists) {
          shopEntry.categories!.push({
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
