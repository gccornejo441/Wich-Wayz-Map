import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  initDB,
  DB_NAME,
  DB_VERSION,
  SHOPS_STORE,
  LOCATIONS_STORE,
} from "../../src/services/indexedDB";

vi.mock("idb", async () => {
  const actual = await vi.importActual("idb");
  return {
    ...actual,
    openDB: vi.fn(),
  };
});

const { openDB } = await import("idb");

describe("initDB", () => {
  let mockDB: Partial<IDBDatabase> & { objectStoreNames: DOMStringList };

  beforeEach(() => {
    mockDB = {
      objectStoreNames: {
        contains: vi.fn(),
        length: 0,
        item: vi.fn(),
        [Symbol.iterator]: vi.fn(),
      },
      createObjectStore: vi.fn(),
    };

    (openDB as unknown as jest.Mock).mockReset();
    (openDB as unknown as jest.Mock).mockImplementation(
      (
        _: string,
        __: number,
        options: { upgrade: (db: IDBDatabase) => void },
      ) => {
        if (options.upgrade) options.upgrade(mockDB as IDBDatabase);
        return Promise.resolve(mockDB as IDBDatabase);
      },
    );
  });

  // Test that initDB calls openDB with the correct parameters
  it("should call openDB with correct parameters", async () => {
    await initDB();
    expect(openDB).toHaveBeenCalledWith(
      DB_NAME,
      DB_VERSION,
      expect.any(Object),
    );
  });

  // Test that initDB creates the correct stores (SHOPS_STORE and LOCATIONS_STORE)
  it("should create SHOPS_STORE if it does not exist", async () => {
    (mockDB.objectStoreNames.contains as jest.Mock).mockReturnValue(false);
    await initDB();
    expect(mockDB.createObjectStore).toHaveBeenCalledWith(SHOPS_STORE, {
      keyPath: "id",
    });
  });

  // Test that initDB does not create the SHOPS_STORE if it already exists
  it("should not create SHOPS_STORE if it already exists", async () => {
    (mockDB.objectStoreNames.contains as jest.Mock).mockReturnValue(true);
    await initDB();
    expect(mockDB.createObjectStore).not.toHaveBeenCalledWith(
      SHOPS_STORE,
      expect.anything(),
    );
  });

  // Test that initDB creates the LOCATIONS_STORE if it does not exist
  it("should create LOCATIONS_STORE if it does not exist", async () => {
    (mockDB.objectStoreNames.contains as jest.Mock).mockImplementation(
      (store) => store !== LOCATIONS_STORE,
    );
    await initDB();
    expect(mockDB.createObjectStore).toHaveBeenCalledWith(LOCATIONS_STORE, {
      keyPath: "id",
    });
  });

  // Test that initDB does not create the LOCATIONS_STORE if it already exists
  it("should not create LOCATIONS_STORE if it already exists", async () => {
    (mockDB.objectStoreNames.contains as jest.Mock).mockReturnValue(true);
    await initDB();
    expect(mockDB.createObjectStore).not.toHaveBeenCalledWith(
      LOCATIONS_STORE,
      expect.anything(),
    );
  });
});
