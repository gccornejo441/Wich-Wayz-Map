import { executeQuery } from "./apiClient";
import {
  IndexedDBShop,
  initDB,
  LOCATIONS_STORE,
  SHOPS_STORE,
} from "./indexedDB";

export interface ShopCountByState {
  state: string;
  shop_count: number;
}

export interface ShopCountByCategory {
  category: string;
  shop_count: number;
}

/**
 * Retrieves the number of shops per state from the database.
 */
export const getShopsPerState = async (): Promise<ShopCountByState[]> => {
  const query = `
    SELECT l.state, COUNT(*) as shop_count
    FROM shops s
    JOIN shop_locations sl ON s.id = sl.shop_id
    JOIN locations l ON sl.location_id = l.id
    GROUP BY l.state
    ORDER BY shop_count DESC
  `;
  const { rows } = await executeQuery<ShopCountByState>(query);
  return rows;
};

/**
 * Retrieves the number of shops per category from the database.
 */
export const getShopsPerCategory = async (): Promise<ShopCountByCategory[]> => {
  const query = `
    SELECT c.category_name as category, COUNT(*) as shop_count
    FROM shops s
    JOIN shop_categories sc ON s.id = sc.shop_id
    JOIN categories c ON sc.category_id = c.id
    GROUP BY c.category_name
  `;
  const { rows } = await executeQuery<ShopCountByCategory>(query);
  return rows;
};

/**
 * Retrieves all shops from the IndexedDB cache.
 */
export const getCachedShops = async (): Promise<IndexedDBShop[]> => {
  const db = await initDB();
  return (await db.getAll(SHOPS_STORE)) as IndexedDBShop[];
};

/**
 * Retrieves all locations from the IndexedDB cache.
 */
export const getCachedLocations = async (): Promise<Location[]> => {
  const db = await initDB();
  return (await db.getAll(LOCATIONS_STORE)) as Location[];
};