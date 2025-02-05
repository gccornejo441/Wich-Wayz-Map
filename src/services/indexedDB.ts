export const DB_NAME = "SANDWICH_LOCATOR_DB";
export const DB_VERSION = 1;
export const SHOPS_STORE = "shops";
export const LOCATIONS_STORE = "locations";

export interface IndexedDBShop {
  id: number;
  name: string;
  description: string;
  categories: Array<{
    id: number;
    category_name: string;
  }>;
  locations: Array<{
    id: number;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    street_address: string;
    latitude: number;
    longitude: number;
  }>;
  created_by: number;
  created_by_username: string;
  date_created: string;
  date_modified?: string;
}

/**
 * Initializes and returns an instance of IDBDatabase.
 * @returns {Promise<IDBDatabase>} A Promise that resolves to an instance of IDBDatabase.
 */
const getIDB = async () => {
  const { openDB } = await import("idb");
  return openDB;
};

/**
 * Initializes the IndexedDB database for the application.
 */
export const initDB = async () => {
  const openDB = await getIDB();
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SHOPS_STORE)) {
        db.createObjectStore(SHOPS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(LOCATIONS_STORE)) {
        db.createObjectStore(LOCATIONS_STORE, { keyPath: "id" });
      }
    },
  });
};

/**
 * Retrieves all data from the specified IndexedDB store.
 */
export const getCachedData = async (storeName: string) => {
  const db = await initDB();
  return db.getAll(storeName);
};

/**
 * Caches the given data in the IndexedDB store specified by the storeName.
 */
export const cacheData = async <T>(storeName: string, data: T[]) => {
  const db = await initDB();
  const tx = db.transaction(storeName, "readwrite");
  data.forEach((item) => tx.store.put(item));
  await tx.done;
};

/**
 * Refreshes the IndexedDB cache by deleting the existing database and reinitializing it.
 */
export const refreshCache = async (): Promise<void> => {
  try {
    const db = await initDB();
    db.close();
    indexedDB.deleteDatabase(DB_NAME);
  } catch (error) {
    console.error("Error refreshing cache:", error);
    alert("Failed to refresh cache. Please try again.");
  }
};
