import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { SearchShops } from "../../src/services/search";
import { getCachedShops } from "../../src/services/mapService";
import { IndexedDBShop } from "../../src/services/indexedDB";

// Mock the getCachedShops function
vi.mock("../../src/services/mapService", () => ({
  getCachedShops: vi.fn(),
}));

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
    (getCachedShops as Mock).mockResolvedValue(mockShops);
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
