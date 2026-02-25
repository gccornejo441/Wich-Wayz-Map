import { DB_NAME, initDB } from "./indexedDB";

/**
 * Known localStorage keys used by the application for caching
 */
const CACHE_KEY_PATTERNS = [
  /^categories$/, // Categories cache
  /^wichwayz\.mapView\.v1:/, // Map view preferences
  /^wichwayz_onboarding_v1:/, // Onboarding state
];

/**
 * Clears all application cache including IndexedDB, localStorage, and sessionStorage
 * @throws Error if cache clearing fails
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    // Step 1: Clear IndexedDB
    await clearIndexedDBCache();

    // Step 2: Clear localStorage (targeted keys only)
    clearLocalStorageCache();

    // Step 3: Clear sessionStorage (safe to clear all for this app)
    sessionStorage.clear();

    console.warn("All application cache cleared successfully");
  } catch (error) {
    console.error("Error clearing cache:", error);
    throw new Error("Failed to clear application cache");
  }
};

/**
 * Clears the IndexedDB database
 */
const clearIndexedDBCache = async (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // Close any open connections first
    initDB()
      .then((db) => {
        db.close();

        // Delete the database
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

        deleteRequest.onsuccess = () => {
          console.warn(`IndexedDB "${DB_NAME}" deleted successfully`);
          resolve();
        };

        deleteRequest.onerror = () => {
          console.error("Error deleting IndexedDB:", deleteRequest.error);
          reject(new Error("Failed to delete IndexedDB"));
        };

        deleteRequest.onblocked = () => {
          console.error(
            "IndexedDB deletion blocked - close all tabs and try again",
          );
          reject(
            new Error(
              "Database deletion blocked. Please close all other tabs of this app and try again.",
            ),
          );
        };
      })
      .catch((error) => {
        console.error("Error initializing DB for deletion:", error);
        reject(error);
      });
  });
};

/**
 * Clears localStorage cache keys that match known patterns
 */
const clearLocalStorageCache = (): void => {
  const keysToRemove: string[] = [];

  // Iterate through all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Check if key matches any of our cache patterns
    const shouldRemove = CACHE_KEY_PATTERNS.some((pattern) =>
      pattern.test(key),
    );

    if (shouldRemove) {
      keysToRemove.push(key);
    }
  }

  // Remove matched keys
  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    console.warn(`Removed localStorage key: ${key}`);
  });

  console.warn(`Cleared ${keysToRemove.length} localStorage cache entries`);
};
