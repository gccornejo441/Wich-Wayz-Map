import { apiRequest } from "./apiClient";
import {
  FILTERED_SHOPS_STORE,
  IndexedDBShop,
  initDB,
  LOCATIONS_STORE,
  SHOPS_STORE,
} from "./indexedDB";
import { Location } from "@models/Location";

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
  return apiRequest<ShopCountByState[]>("/analytics/shops-per-state");
};

/**
 * Retrieves the number of shops per category from the database.
 */
export const getShopsPerCategory = async (): Promise<ShopCountByCategory[]> => {
  return apiRequest<ShopCountByCategory[]>("/analytics/shops-per-category");
};

/**
 * Retrieves all shops from the IndexedDB cache.
 */
export const getCachedShops = async (): Promise<IndexedDBShop[]> => {
  const db = await initDB();
  return (await db.getAll(SHOPS_STORE)) as IndexedDBShop[];
};

/**
 * Retrieves all filtered shops from the IndexedDB cache.
 */
export const getFilteredShops = async (): Promise<IndexedDBShop[]> => {
  const db = await initDB();
  return (await db.getAll(FILTERED_SHOPS_STORE)) as IndexedDBShop[];
};

/**
 * Retrieves all locations from the IndexedDB cache.
 */
export const getCachedLocations = async (): Promise<Location[]> => {
  const db = await initDB();
  return (await db.getAll(LOCATIONS_STORE)) as Location[];
};
