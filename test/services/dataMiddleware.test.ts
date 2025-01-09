import { describe, it, expect, vi } from "vitest";
import { getCurrentUser } from "../../src/services/security";
import { handleLocationSubmit } from "../../src/services/dataMiddleware";
import {
  submitLocationWithShop,
  GetShops,
} from "../../src/services/shopLocation";
import { cacheData } from "../../src/services/indexedDB";
import { AddAShopPayload } from "../../src/types/dataTypes";

vi.mock("../../src/services/security");
vi.mock("../../src/services/shopLocation");
vi.mock("../../src/services/indexedDB");

describe("handleLocationSubmit", () => {
  it("should submit location and shop successfully", async () => {
    const mockUser = { sub: "123", membershipStatus: "member" };
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

    const mockPayload = {
      location: {
        id: 1,
        postal_code: "12345",
        latitude: 40.7128,
        longitude: -74.006,
        street_address: "123 Main St",
        city: "New York",
        state: "NY",
        country: "USA",
      },
      shop: {
        id: 2,
        name: "Test Shop",
        created_by: 123,
      },
    };
    vi.mocked(submitLocationWithShop).mockResolvedValue(mockPayload);

    const mockShops = [
      {
        id: 2,
        name: "Test Shop",
        created_by: 123,
        locations: [
          {
            id: 1,
            postal_code: "12345",
            latitude: 40.7128,
            longitude: -74.006,
            street_address: "123 Main St",
            city: "New York",
            state: "NY",
            country: "USA",
          },
        ],
      },
    ];

    vi.mocked(GetShops).mockResolvedValue(mockShops);

    const setShops = vi.fn();
    const setLocations = vi.fn();
    const addToast = vi.fn();
    const logout = vi.fn();
    const navigate = vi.fn();

    const result = await handleLocationSubmit(
      {} as AddAShopPayload,
      setShops,
      setLocations,
      addToast,
      logout,
      navigate,
    );

    expect(result).toBe(true);
    expect(setShops).toHaveBeenCalledWith(mockShops);
    expect(setLocations).toHaveBeenCalledWith(mockShops[0].locations);
    expect(addToast).toHaveBeenCalledWith(
      "Location and shop submitted successfully!",
      "success",
    );
    expect(cacheData).toHaveBeenCalledWith("shops", mockShops);
    expect(cacheData).toHaveBeenCalledWith("locations", mockShops[0].locations);
  });
});
