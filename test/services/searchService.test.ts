import { describe, it, expect, beforeEach, vi, MockedFunction } from "vitest";
import { SearchShops } from "../../src/services/search";
import { getCachedData } from "../../src/services/indexedDB";
import { IndexedDBShop } from "../../src/services/indexedDB";

// Partial mock to only override getCachedData
vi.mock("../../src/services/indexedDB", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/services/indexedDB")
  >("../../src/services/indexedDB");

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
      locations: [
        {
          id: 1,
          street_address: "123 Main St",
          city: "San Francisco",
          state: "CA",
          postal_code: "94102",
          country: "USA",
          latitude: 37.7749,
          longitude: -122.4194,
          location_open: true,
        },
      ],
      created_by: 1,
      created_by_username: "user1",
      date_created: "2023-01-01",
    },
    {
      id: 2,
      name: "Book Store",
      description: "Wide selection of books",
      categories: [],
      locations: [
        {
          id: 2,
          street_address: "456 Oak Ave",
          city: "Los Angeles",
          state: "CA",
          postal_code: "90001",
          country: "USA",
          latitude: 34.0522,
          longitude: -118.2437,
          location_open: true,
        },
      ],
      created_by: 2,
      created_by_username: "user2",
      date_created: "2023-01-02",
    },
    {
      id: 3,
      name: "Bakery",
      description: "Fresh bread and pastries",
      categories: [],
      locations: [
        {
          id: 3,
          street_address: "789 Pine St",
          city: "San Diego",
          state: "CA",
          postal_code: "92101",
          country: "USA",
          latitude: 32.7157,
          longitude: -117.1611,
          location_open: true,
        },
      ],
      created_by: 3,
      created_by_username: "user3",
      date_created: "2023-01-03",
    },
  ];

  beforeEach(() => {
    (getCachedData as MockedFunction<typeof getCachedData>).mockResolvedValue(
      mockShops,
    );
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
