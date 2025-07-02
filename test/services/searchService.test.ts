import { describe, it, expect, beforeEach, vi, MockedFunction } from "vitest";
import { SearchShops } from "../../src/services/search";
import { getCachedData } from "../../src/services/indexedDB";
import { IndexedDBShop } from "../../src/services/indexedDB";

// Partial mock to only override getCachedData
vi.mock("../../src/services/indexedDB", async () => {
  const actual = await vi.importActual<typeof import("../../src/services/indexedDB")>(
    "../../src/services/indexedDB"
  );

  return {
    ...actual,
    getCachedData: vi.fn(),
  };
});

describe("SearchShops", () => {
  const mockShops: IndexedDBShop[] = [
    {
      id: 1,
      name: "Coffee Shop",
      description: "Best coffee in town",
      categories: [],
      locations: [],
      created_by: 1,
      created_by_username: "user1",
      date_created: "2023-01-01",
    },
    {
      id: 2,
      name: "Book Store",
      description: "Wide selection of books",
      categories: [],
      locations: [],
      created_by: 2,
      created_by_username: "user2",
      date_created: "2023-01-02",
    },
    {
      id: 3,
      name: "Bakery",
      description: "Fresh bread and pastries",
      categories: [],
      locations: [],
      created_by: 3,
      created_by_username: "user3",
      date_created: "2023-01-03",
    },
  ];

  beforeEach(() => {
    (getCachedData as MockedFunction<typeof getCachedData>).mockResolvedValue(mockShops);
  });

  it("should return shops that match the query", async () => {
    const query = "coffee";
    const results = await SearchShops(query);
    expect(results).toHaveLength(1);
    expect(results[0].shop.name).toBe("Coffee Shop");
  });

  it("should return an empty array if no shops match the query", async () => {
    const query = "restaurant";
    const results = await SearchShops(query);
    expect(results).toHaveLength(0);
  });
});
