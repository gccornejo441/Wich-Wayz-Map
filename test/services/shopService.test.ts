import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { ShopWithUser } from "../../src/models/ShopWithUser";
import { apiRequest } from "../../src/services/apiClient";
import { GetShops } from "../../src/services/shopService";

vi.mock("../../src/services/apiClient", () => ({
  apiRequest: vi.fn(),
}));

describe("GetShops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return formatted shop data when query is successful", async () => {
    const mockData: ShopWithUser[] = [
      {
        id: 1,
        name: "Test Shop",
        description: "A test description",
        modified_by: undefined,
        created_by: 10,
        created_by_username: "user10",
        users_avatar_id: "avatar10",
        date_created: "2024-01-01",
        date_modified: undefined,
        locations: [],
        categories: [],
      },
    ];

    (apiRequest as Mock).mockResolvedValue(mockData);

    const result: ShopWithUser[] = await GetShops();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockData[0]);

    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no shop data is found", async () => {
    (apiRequest as Mock).mockResolvedValue([]);

    const result = await GetShops();

    expect(result).toEqual([]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it("should throw an error when query execution fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    (apiRequest as Mock).mockRejectedValue(
      new Error("Database connection failed"),
    );

    await expect(GetShops()).rejects.toThrow("Failed to fetch shops.");
    expect(apiRequest).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });
});
