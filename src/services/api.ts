import { InValue } from "@libsql/client";
import { ShopLocation } from "../types/dataTypes";
import { executeQuery, tursoClient } from "./apiClient";

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

export interface ShopsContextType {
  shops: ShopWithUser[];
  locations: Location[];
  setShops: React.Dispatch<React.SetStateAction<ShopWithUser[]>>;
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
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
}

export interface Shop {
  id?: number;
  name: string;
  description?: string | null;
  created_by: number;
  modified_by?: number | null;
  date_created?: string;
  date_modified?: string;
  id_location: number;
}

export interface ShopWithUser extends Shop {
  created_by_username?: string;
  users_avatar_id?: string;
  location_ids?: number[];
}

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

export const InsertLocation = async (
  locationData: Partial<Location>,
): Promise<Location | null> => {
  try {
    const query = `
        INSERT INTO locations (postal_code, latitude, longitude, street_address, city, state, country)
        VALUES ($postal_code, $latitude, $longitude, $street_address, $city, $state, $country)
        RETURNING *;
      `;
    const params: Record<string, InValue> = {
      postal_code: locationData.postal_code || "",
      latitude: locationData.latitude || 0,
      longitude: locationData.longitude || 0,
      street_address: locationData.street_address || "",
      city: locationData.city || "",
      state: locationData.state || "",
      country: locationData.country || "",
    };

    const { rows } = await executeQuery<Location>(query, params);
    return rows[0];
  } catch (error) {
    console.error("Error inserting location:", error);
    return null;
  }
};

export const UpdateLocation = async (
  locationData: Location,
): Promise<Location | null> => {
  try {
    const query = `
        UPDATE locations
        SET
          postal_code = $postal_code,
          latitude = $latitude,
          longitude = $longitude,
          street_address = $street_address,
          street_address_second = $street_address_second,
          city = $city,
          state = $state,
          country = $country,
          modified_by = $modified_by,
          date_modified = CURRENT_TIMESTAMP
        WHERE id = $id
        RETURNING *;
      `;
    const params: Record<string, InValue> = {
      id: locationData.id || 0,
      postal_code: locationData.postal_code || "",
      latitude: locationData.latitude || 0,
      longitude: locationData.longitude || 0,
      street_address: locationData.street_address || "",
      street_address_second: locationData.street_address_second || null,
      city: locationData.city || "",
      state: locationData.state || "",
      country: locationData.country || "",
      modified_by: locationData.modified_by || null,
    };

    const { rows } = await executeQuery<Location>(query, params);
    return rows[0];
  } catch (error) {
    console.error("Error updating location:", error);
    return null;
  }
};

export async function submitLocationWithShop(payload: {
  location: Omit<Location, "id">;
  shop: Omit<Shop, "id" | "id_location">;
}): Promise<{ location: Location; shop: Shop }> {
  const db = await tursoClient.transaction();

  try {
    const locationStmt = {
      sql: `
            INSERT INTO locations (postal_code, latitude, longitude, street_address, city, state, country, modified_by, date_created, date_modified)
            VALUES ($postal_code, $latitude, $longitude, $street_address, $city, $state, $country, $modified_by, $date_created, $date_modified)
            RETURNING *;
          `,
      args: {
        postal_code: payload.location.postal_code,
        latitude: payload.location.latitude,
        longitude: payload.location.longitude,
        street_address: payload.location.street_address,
        city: payload.location.city,
        state: payload.location.state,
        country: payload.location.country,
        modified_by: payload.location.modified_by || null,
        date_created: payload.location.date_created || null,
        date_modified: payload.location.date_modified || null,
      },
    };

    const locationResult = await db.execute(locationStmt);

    if (!locationResult.rows || locationResult.rows.length === 0) {
      throw new Error("Failed to insert location.");
    }

    const location = locationResult.rows[0] as unknown as Location;

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
        id_location: location.id || null,
      },
    };

    const shopResult = await db.execute(shopStmt);

    if (!shopResult.rows || shopResult.rows.length === 0) {
      throw new Error("Failed to insert shop.");
    }

    const shop = shopResult.rows[0] as unknown as Shop;

    await db.commit();
    return { location, shop };
  } catch (error) {
    await db.rollback();
    console.error("Error submitting location with shop:", error);
    throw error;
  }
}

export const InsertShop = async (
  shopData: Partial<Shop>,
): Promise<Shop | null> => {
  try {
    const query = `
        INSERT INTO shops (name, description, created_by, id_location)
        VALUES ($name, $description, $created_by, $id_location)
        RETURNING *;
      `;
    const params: Record<string, InValue> = {
      name: shopData.name || "",
      description: shopData.description || null,
      created_by: shopData.created_by || 0,
      id_location: shopData.id_location || 0,
    };

    const { rows } = await executeQuery<Shop>(query, params);
    return rows[0];
  } catch (error) {
    console.error("Error inserting shop:", error);
    return null;
  }
};

export const UpdateShop = async (updatedData: Shop): Promise<Shop | null> => {
  try {
    const query = `
        UPDATE shops
        SET name = $name,
            description = $description,
            modified_by = $modified_by,
            id_location = $id_location,
            date_modified = CURRENT_TIMESTAMP
        WHERE id = $id
        RETURNING *;
      `;
    const params: Record<string, InValue> = {
      id: updatedData.id || 0,
      name: updatedData.name || "",
      description: updatedData.description || null,
      modified_by: updatedData.modified_by || null,
      id_location: updatedData.id_location || 0,
    };

    const { rows } = await executeQuery<Shop>(query, params);
    return rows[0];
  } catch (error) {
    console.error("Error updating shop:", error);
    return null;
  }
};

export const GetShops = async (): Promise<ShopWithUser[]> => {
  try {
    const shopsQuery = `
        SELECT 
          shops.id, 
          shops.name, 
          shops.description, 
          shops.modified_by, 
          shops.created_by, 
          users.username AS created_by_username, 
          users.avatar AS users_avatar_id, 
          shops.date_created, 
          shops.date_modified, 
          shops.id_location
        FROM shops
        LEFT JOIN users ON shops.created_by = users.id;
      `;

    const { rows: shops } = await executeQuery<ShopWithUser>(shopsQuery);

    for (const shop of shops) {
      const locationQuery = `
          SELECT location_id 
          FROM shop_locations 
          WHERE shop_id = $shop_id;
        `;
      const { rows: locationIds } = await executeQuery<{ location_id: number }>(
        locationQuery,
        { shop_id: shop.id || null },
      );

      shop.location_ids = locationIds.map((loc) => loc.location_id);
    }

    return shops;
  } catch (error) {
    console.error("Error fetching shops:", error);
    throw new Error("Failed to fetch shops.");
  }
};
