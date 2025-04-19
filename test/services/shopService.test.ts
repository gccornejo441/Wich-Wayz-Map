import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShopWithUser } from "../../src/models/ShopWithUser";
import { executeQuery } from "../../src/services/apiClient";
import { GetShops } from "../../src/services/shopService";

vi.mock("../../src/services/apiClient", () => ({
  executeQuery: vi.fn(),
}));

describe("GetShops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return formatted shop data when query is successful", async () => {
    const mockData = {
      rows: [
        {
          shop_id: 1,
          shop_name: "Test Shop",
          description: "A test description",
          modified_by: null,
          created_by: 10,
          created_by_username: "user10",
          users_avatar_id: "avatar10",
          date_created: "2024-01-01",
          date_modified: null,
          id_location: 5,
          postal_code: "12345",
          latitude: 40.7128,
          longitude: -74.006,
          street_address: "123 Main St",
          street_address_second: "Suite 200",
          city: "New York",
          state: "NY",
          country: "USA",
          location_modified_by: null,
          location_date_created: null,
          location_date_modified: null,
          location_open: null,
          phone: null,
          website_url: null,
          category_id: 2,
          category_name: "Retail",
        },
      ],
    };

    (executeQuery as unknown as jest.Mock).mockResolvedValue(mockData);

    const result: ShopWithUser[] = await GetShops();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      name: "Test Shop",
      description: "A test description",
      modified_by: undefined,
      created_by: 10,
      created_by_username: "user10",
      users_avatar_id: "avatar10",
      date_created: "2024-01-01",
      date_modified: undefined,
      locations: [
        {
          id: 5,
          postal_code: "12345",
          latitude: 40.7128,
          longitude: -74.006,
          modified_by: undefined,
          date_created: undefined,
          date_modified: undefined,
          street_address: "123 Main St",
          street_address_second: "Suite 200",
          city: "New York",
          state: "NY",
          country: "USA",
          location_open: undefined,
          phone: null,
          website: null,
        },
      ],
      categories: [
        {
          id: 2,
          category_name: "Retail",
        },
      ],
    });

    expect(executeQuery).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no shop data is found", async () => {
    (executeQuery as unknown as jest.Mock).mockResolvedValue({ rows: [] });

    const result = await GetShops();

    expect(result).toEqual([]);
    expect(executeQuery).toHaveBeenCalledTimes(1);
  });

  it("should throw an error when query execution fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    (executeQuery as unknown as jest.Mock).mockRejectedValue(
      new Error("Database connection failed"),
    );

    await expect(GetShops()).rejects.toThrow("Failed to fetch shops.");
    expect(executeQuery).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it("should handle missing optional fields correctly", async () => {
    const mockData = {
      rows: [
        {
          shop_id: 1,
          shop_name: "Minimal Shop",
          description: null,
          modified_by: null,
          created_by: 20,
          created_by_username: null,
          users_avatar_id: null,
          date_created: "2024-02-02",
          date_modified: null,
          id_location: null,
          postal_code: null,
          latitude: null,
          longitude: null,
          street_address: null,
          street_address_second: null,
          city: null,
          state: null,
          country: null,
          location_modified_by: null,
          location_date_created: null,
          location_date_modified: null,
          location_open: null,
          phone: null,
          website_url: null,
          category_id: null,
          category_name: null,
        },
      ],
    };

    (executeQuery as unknown as jest.Mock).mockResolvedValue(mockData);

    const result = await GetShops();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      name: "Minimal Shop",
      description: undefined,
      modified_by: undefined,
      created_by: 20,
      created_by_username: "admin",
      users_avatar_id: undefined,
      date_created: "2024-02-02",
      date_modified: undefined,
      locations: [],
      categories: [],
    });

    expect(executeQuery).toHaveBeenCalledTimes(1);
  });
});
