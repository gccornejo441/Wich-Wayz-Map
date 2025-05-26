import { tursoClient } from "./apiClient";
import { Location } from "@models/Location";
import { Shop } from "@models/Shop";

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
