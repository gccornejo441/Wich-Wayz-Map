const getIDB = async () => {
  const { openDB } = await import("idb");
  return openDB;
};

const DB_NAME = "SANDWICH_LOCATOR_DB";
const DB_VERSION = 1;
const SHOPS_STORE = "shops";
const LOCATIONS_STORE = "locations";

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

export const getCachedData = async (storeName: string) => {
  const db = await initDB();
  return db.getAll(storeName);
};

export const cacheData = async <T>(storeName: string, data: T[]) => {
  const db = await initDB();
  const tx = db.transaction(storeName, "readwrite");
  data.forEach((item) => tx.store.put(item));
  await tx.done;
};
