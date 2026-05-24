import { describe, it, expect, beforeEach, vi, MockedFunction } from "vitest";
import { FilterShops, SearchShops } from "../../src/services/search";
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

describe("FilterShops", () => {
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 5);

  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 120);

  const mockShops: IndexedDBShop[] = [
    {
      id: 1,
      name: "Open Deli",
      description: "Classic deli sandwiches",
      categories: [{ id: 10, category_name: "Deli" }],
      locations: [
        {
          id: 1,
          street_address: "1 Main St",
          city: "New York",
          state: "NY",
          postal_code: "10001",
          country: "USA",
          latitude: 40.7128,
          longitude: -74.006,
          location_open: true,
          locationStatus: "open",
        },
      ],
      created_by: 1,
      created_by_username: "user1",
      date_created: recentDate.toISOString(),
    },
    {
      id: 2,
      name: "Closed Hoagies",
      description: "Hoagies",
      categories: [{ id: 20, category_name: "Hoagies" }],
      locations: [
        {
          id: 2,
          street_address: "2 Market St",
          city: "Philadelphia",
          state: "PA",
          postal_code: "19106",
          country: "USA",
          latitude: 39.9526,
          longitude: -75.1652,
          location_open: false,
          locationStatus: "permanently_closed",
        },
      ],
      created_by: 2,
      created_by_username: "user2",
      date_created: oldDate.toISOString(),
    },
  ];

  beforeEach(() => {
    (getCachedData as MockedFunction<typeof getCachedData>).mockResolvedValue(
      mockShops,
    );
  });

  it("filters shops by explicit location status", async () => {
    const results = await FilterShops({ locationStatus: "open" });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Open Deli");
  });

  it("matches any selected category within the category group", async () => {
    const results = await FilterShops({ categoryIds: [20, 30] });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Closed Hoagies");
  });

  it("filters shops by distance from an anchor", async () => {
    const results = await FilterShops({
      distanceMiles: 5,
      distanceAnchor: [-74.006, 40.7128],
    });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Open Deli");
  });

  it("filters shops by saved shop IDs", async () => {
    const results = await FilterShops({
      savedOnly: true,
      savedShopIds: [2],
    });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Closed Hoagies");
  });

  it("filters shops by recently added range", async () => {
    const results = await FilterShops({ recentlyAdded: "7d" });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Open Deli");
  });
});
