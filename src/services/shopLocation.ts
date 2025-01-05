import { ShopLocation } from "../types/dataTypes";
import { Category, executeQuery, tursoClient } from "./apiClient";

export interface User {
  id?: number;
  email: string;
  hashed_password?: string;
  username?: string;
  verified?: boolean;
  verification_token?: string;
  modified_by?: string;
  date_created?: string;
  date_modified?: string;
  membership_status?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  account_status?: string;
  last_login?: string;
  avatar?: string;
  token_expiry?: string;
  reset_token?: string;
}

export interface Location {
  id?: number;
  postal_code: string;
  latitude: number;
  longitude: number;
  modified_by?: number | null;
  date_created?: string;
  date_modified?: string;
  street_address: string;
  street_address_second?: string | null;
  city: string;
  state: string;
  country: string;
  location_open?: boolean;
}

export interface Shop {
  id?: number;
  name: string;
  description?: string | null;
  created_by: number;
  modified_by?: number | null;
  date_created?: string;
  date_modified?: string | null;
  id_location?: number;
}

export interface ShopWithUser extends Shop {
  created_by_username?: string;
  users_avatar_id?: string;
  locations?: Location[];
  categories?: Category[];
}

/**
 * Retrieves all locations from the database.
 *
 * @returns {Promise<Location[]>} A list of all locations.
 * @throws Logs an error if the fetch fails.
 */
export const GetLocations = async (): Promise<Location[]> => {
  try {
    const query = `SELECT * FROM locations`;
    const { rows } = await executeQuery<Location>(query);
    return rows;
  } catch (error) {
    console.error("Error fetching locations:", error);
    return [];
  }
};

/**
 * Retrieves all shop-location pairs from the database.
 *
 * @returns An array of objects, each with `shop_id` and `location_id` properties.
 * @throws Logs an error if the fetch fails.
 */
export const GetShopLocations = async (): Promise<ShopLocation[]> => {
  try {
    const query = `SELECT * FROM shop_locations`;
    const { rows } = await executeQuery<ShopLocation>(query);
    return rows;
  } catch (error) {
    console.error("Error fetching shop-locations:", error);
    return [];
  }
};

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

/**
 * Submits a location and associates it with a shop and categories in a single transaction.
 *
 * @param {Object} payload
 * @param {Object} payload.location - The location to submit.
 * @param {Object} payload.shop - The shop to submit or associate with.
 * @param {number[]} payload.categoryIds - The list of category IDs to associate with the shop.
 * @returns {Promise<{location: Location, shop: Shop}>}
 *   The inserted/associated location and shop.
 */
export async function submitLocationWithShop(payload: {
  location: Omit<Location, "id">;
  shop: Omit<Shop, "id" | "id_location"> & { id?: number };
  categoryIds: number[];
}): Promise<{ location: Location; shop: Shop }> {
  const db = await tursoClient.transaction();

  try {
    const duplicateLocationStmt = {
      sql: `
        SELECT * FROM locations 
        WHERE (latitude = $latitude AND longitude = $longitude)
           OR (postal_code = $postal_code AND street_address = $street_address AND city = $city AND state = $state AND country = $country AND location_open = $location_open)
        LIMIT 1;
      `,
      args: {
        latitude: payload.location.latitude,
        longitude: payload.location.longitude,
        postal_code: payload.location.postal_code,
        street_address: payload.location.street_address,
        city: payload.location.city,
        state: payload.location.state,
        country: payload.location.country,
        location_open: true,
      },
    };

    const duplicateLocationResult = await db.execute(duplicateLocationStmt);
    let location: Location;

    if (duplicateLocationResult.rows.length > 0) {
      location = duplicateLocationResult.rows[0] as unknown as Location;
    } else {
      const locationStmt = {
        sql: `
          INSERT INTO locations (postal_code, latitude, longitude, street_address, street_address_second, city, state, country, modified_by, date_created, date_modified, location_open)
          VALUES ($postal_code, $latitude, $longitude, $street_address, $street_address_second, $city, $state, $country, $modified_by, $date_created, $date_modified, $location_open)
          RETURNING *;
        `,
        args: {
          postal_code: payload.location.postal_code,
          latitude: payload.location.latitude,
          longitude: payload.location.longitude,
          street_address: payload.location.street_address,
          street_address_second: payload.location.street_address_second || null,
          city: payload.location.city,
          state: payload.location.state,
          country: payload.location.country,
          modified_by: payload.location.modified_by || null,
          date_created: payload.location.date_created || null,
          date_modified: payload.location.date_modified || null,
          location_open: true,
        },
      };

      const locationResult = await db.execute(locationStmt);

      if (!locationResult.rows || locationResult.rows.length === 0) {
        throw new Error("Failed to insert location.");
      }

      location = locationResult.rows[0] as unknown as Location;
    }

    const existingShopStmt = {
      sql: `
        SELECT * FROM shops WHERE name = $name LIMIT 1;
      `,
      args: { name: payload.shop.name },
    };

    const existingShopResult = await db.execute(existingShopStmt);
    const existingShop =
      existingShopResult.rows && existingShopResult.rows.length > 0
        ? (existingShopResult.rows[0] as unknown as Shop)
        : null;

    let shop: Shop;

    if (!existingShop) {
      const shopStmt = {
        sql: `
          INSERT INTO shops (name, description, created_by, modified_by, id_location)
          VALUES ($name, $description, $created_by, $modified_by, $id_location)
          RETURNING *;
        `,
        args: {
          name: payload.shop.name,
          description: payload.shop.description || null,
          created_by: payload.shop.created_by,
          modified_by: payload.shop.modified_by || null,
          id_location: location.id ?? 0,
        },
      };

      const shopResult = await db.execute(shopStmt);

      if (!shopResult.rows || shopResult.rows.length === 0) {
        throw new Error("Failed to insert shop.");
      }

      shop = shopResult.rows[0] as unknown as Shop;
    } else {
      shop = existingShop;

      if (!shop.id_location) {
        const updateShopStmt = {
          sql: `
            UPDATE shops
            SET id_location = $id_location
            WHERE id = $shop_id;
          `,
          args: {
            id_location: location.id ?? 0,
            shop_id: shop.id ?? 0,
          },
        };

        await db.execute(updateShopStmt);
      }
    }

    const shopLocationStmt = {
      sql: `
        INSERT INTO shop_locations (shop_id, location_id)
        VALUES ($shop_id, $location_id);
      `,
      args: {
        shop_id: shop.id ?? 0,
        location_id: location.id ?? 0,
      },
    };

    await db.execute(shopLocationStmt);

    for (const categoryId of payload.categoryIds) {
      const existingCategoryStmt = {
        sql: `
          SELECT 1 FROM shop_categories WHERE shop_id = $shop_id AND category_id = $category_id LIMIT 1;
        `,
        args: {
          shop_id: shop.id ?? 0,
          category_id: categoryId ?? 0,
        },
      };

      const existingCategoryResult = await db.execute(existingCategoryStmt);

      if (existingCategoryResult.rows.length === 0) {
        const insertCategoryStmt = {
          sql: `
            INSERT INTO shop_categories (shop_id, category_id)
            VALUES ($shop_id, $category_id);
          `,
          args: {
            shop_id: shop.id ?? 0,
            category_id: categoryId ?? 0,
          },
        };

        await db.execute(insertCategoryStmt);
      }
    }

    await db.commit();

    return { location, shop };
  } catch (error) {
    await db.rollback();
    console.error("Error submitting location with shop:", error);
    throw error;
  }
}

/**
 * Inserts a new location into the database.
 *
 * @param {Partial<Location>} locationData - An object containing the location data to be inserted.
 * @returns {Promise<Location | null>} The inserted location object if successful, or null if there was an error.
 * @throws Logs an error if the insertion fails.
 */
// export const InsertLocation = async (
//   locationData: Partial<Location>,
// ): Promise<Location | null> => {
//   try {
//     const query = `
//         INSERT INTO locations (postal_code, latitude, longitude, street_address, city, state, country, location_open)
//         VALUES ($postal_code, $latitude, $longitude, $street_address, $city, $state, $country, $location_open)
//         RETURNING *;
//       `;
//     const params: Record<string, InValue> = {
//       postal_code: locationData.postal_code || "",
//       latitude: locationData.latitude || 0,
//       longitude: locationData.longitude || 0,
//       street_address: locationData.street_address || "",
//       city: locationData.city || "",
//       state: locationData.state || "",
//       country: locationData.country || "",
//       location_open: true,
//     };

//     const { rows } = await executeQuery<Location>(query, params);
//     return rows[0];
//   } catch (error) {
//     console.error("Error inserting location:", error);
//     return null;
//   }
// };

/**
 * Updates a location in the database with the given data.
 *
 * @param {Location} locationData The location data to update.
 * @returns {Promise<Location | null>} The updated location, or null on error.
 */
// export const UpdateLocation = async (
//   locationData: Location,
// ): Promise<Location | null> => {
//   try {
//     const query = `
//         UPDATE locations
//         SET
//           postal_code = $postal_code,
//           latitude = $latitude,
//           longitude = $longitude,
//           street_address = $street_address,
//           street_address_second = $street_address_second,
//           city = $city,
//           state = $state,
//           country = $country,
//           modified_by = $modified_by,
//           date_modified = CURRENT_TIMESTAMP
//           location_open = $location_open
//         WHERE id = $id
//         RETURNING *;
//       `;
//     const params: Record<string, InValue> = {
//       id: locationData.id || 0,
//       postal_code: locationData.postal_code || "",
//       latitude: locationData.latitude || 0,
//       longitude: locationData.longitude || 0,
//       street_address: locationData.street_address || "",
//       street_address_second: locationData.street_address_second || null,
//       city: locationData.city || "",
//       state: locationData.state || "",
//       country: locationData.country || "",
//       modified_by: locationData.modified_by || null,
//       location_open: locationData.location_open || false,
//     };

//     const { rows } = await executeQuery<Location>(query, params);
//     return rows[0];
//   } catch (error) {
//     console.error("Error updating location:", error);
//     return null;
//   }
// };

/**
 * Inserts a new shop into the database.
 *
 * @param shopData - An object containing the shop data to be inserted.
 * @returns The inserted shop object if successful, or null if there was an error.
 * @throws Logs an error if the insertion fails.
 */
// export const InsertShop = async (
//   shopData: Partial<Shop>
// ): Promise<Shop | null> => {
//   try {
//     const query = `
//         INSERT INTO shops (name, description, created_by, id_location)
//         VALUES ($name, $description, $created_by, $id_location)
//         RETURNING *;
//       `;
//     const params: Record<string, InValue> = {
//       name: shopData.name || "",
//       description: shopData.description || null,
//       created_by: shopData.created_by || 0,
//       id_location: shopData.id_location || 0,
//     };

//     const { rows } = await executeQuery<Shop>(query, params);
//     return rows[0];
//   } catch (error) {
//     console.error("Error inserting shop:", error);
//     return null;
//   }
// };

/**
 * Updates a shop's information in the database.
 *
 * @param updatedData - An object containing the shop's updated data.
 * @returns The updated shop object if successful, or null if there was an error.
 * @throws Logs an error if the update fails.
 */
// export const UpdateShop = async (updatedData: Shop): Promise<Shop | null> => {
//   try {
//     const query = `
//         UPDATE shops
//         SET name = $name,
//             description = $description,
//             modified_by = $modified_by,
//             id_location = $id_location,
//             date_modified = CURRENT_TIMESTAMP
//         WHERE id = $id
//         RETURNING *;
//       `;
//     const params: Record<string, InValue> = {
//       id: updatedData.id || 0,
//       name: updatedData.name || "",
//       description: updatedData.description || null,
//       modified_by: updatedData.modified_by || null,
//       id_location: updatedData.id_location || 0,
//     };

//     const { rows } = await executeQuery<Shop>(query, params);
//     return rows[0];
//   } catch (error) {
//     console.error("Error updating shop:", error);
//     return null;
//   }
// };

/**
 * Populates the shop_locations table based on existing data in the shops and locations tables.
 *
 * @returns {Promise<void>} Resolves when the population process is complete.
 * @throws Logs an error if the process fails.
 */
// export const PopulateShopLocations = async (): Promise<void> => {
//   try {
//     const shopsQuery = `SELECT id AS shop_id, id_location FROM shops WHERE id_location IS NOT NULL`;
//     const { rows: shops } = await executeQuery<{
//       shop_id: number;
//       id_location: number;
//     }>(shopsQuery);

//     if (!shops.length) {
//       console.info("No shops found to populate shop_locations.");
//       return;
//     }

//     const insertShopLocationsQuery = `
//       INSERT INTO shop_locations (shop_id, location_id, date_created, date_modified)
//       VALUES ($shop_id, $location_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
//       ON CONFLICT (shop_id, location_id) DO NOTHING;
//     `;

//     for (const shop of shops) {
//       await executeQuery(insertShopLocationsQuery, {
//         shop_id: shop.shop_id,
//         location_id: shop.id_location,
//       });
//     }

//     console.info("Successfully populated shop_locations table.");
//   } catch (error) {
//     console.error("Error populating shop_locations table:", error);
//     throw new Error("Failed to populate shop_locations table.");
//   }
// };
