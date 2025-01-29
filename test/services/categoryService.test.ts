import { describe, expect, test, vi, beforeEach, Mock } from "vitest";
import {
  checkCategoryExistsInDatabase,
  addCategoryToDatabase,
  fetchCategoriesFromDatabase,
  readCategoriesFromLocalStorage,
  writeCategoriesToLocalStorage,
  synchronizeLocalStorageWithDatabase,
  Category,
} from "../../src/services/categoryService";
import { executeQuery, insertData } from "../../src/services/apiClient";

vi.mock("../../src/services/apiClient", () => ({
  executeQuery: vi.fn(),
  insertData: vi.fn(),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Category Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe("Database Operations", () => {
    test("checkCategoryExistsInDatabase returns true when category exists", async () => {
      (executeQuery as Mock).mockResolvedValueOnce({
        rows: [{ count: 1 }],
      });

      const exists = await checkCategoryExistsInDatabase("existing-category");
      expect(exists).toBe(true);
      expect(executeQuery).toHaveBeenCalledWith(
        "SELECT COUNT(*) as count FROM categories WHERE category_name = ?",
        ["existing-category"],
      );
    });

    test("addCategoryToDatabase inserts data correctly", async () => {
      await addCategoryToDatabase("new-category", "description");
      expect(insertData).toHaveBeenCalledWith(
        "categories",
        ["category_name", "description"],
        ["new-category", "description"],
      );
    });

    test("fetchCategoriesFromDatabase returns categories", async () => {
      const mockCategories = [
        { id: 1, category_name: "cat1", description: "desc1" },
        { id: 2, category_name: "cat2", description: "desc2" },
      ];
      (executeQuery as Mock).mockResolvedValueOnce({ rows: mockCategories });

      const result = await fetchCategoriesFromDatabase();
      expect(result).toEqual(mockCategories);
      expect(executeQuery).toHaveBeenCalledWith(
        "SELECT id, category_name, description FROM categories",
      );
    });
  });

  describe("LocalStorage Operations", () => {
    test("write/readCategoriesFromLocalStorage handles data correctly", () => {
      const testData: Category[] = [
        { id: 1, category_name: "test", description: "test" },
      ];

      writeCategoriesToLocalStorage(testData);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "categories",
        JSON.stringify(testData),
      );

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(testData));
      const result = readCategoriesFromLocalStorage();
      expect(result).toEqual(testData);
    });

    test("readCategoriesFromLocalStorage returns empty array when empty", () => {
      const result = readCategoriesFromLocalStorage();
      expect(result).toEqual([]);
    });
  });

  describe("Synchronization", () => {
    test("synchronizeLocalStorageWithDatabase updates when out of sync", async () => {
      const dbData = [{ category_name: "db-category" }];
      const localStorageData = [{ category_name: "old-category" }];

      (executeQuery as Mock).mockResolvedValue({ rows: dbData });
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(localStorageData),
      );

      await synchronizeLocalStorageWithDatabase();
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "categories",
        JSON.stringify(dbData),
      );
    });

    test("synchronizeLocalStorageWithDatabase does nothing when in sync", async () => {
      const dbData = [{ category_name: "same-category" }];

      (executeQuery as Mock).mockResolvedValue({ rows: dbData });
      localStorageMock.getItem.mockReturnValue(JSON.stringify(dbData));

      await synchronizeLocalStorageWithDatabase();
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
