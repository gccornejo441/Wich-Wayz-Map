import { describe, it, expect, vi } from "vitest";
import { getCurrentUser } from "../../src/services/security";
import { handleLocationSubmit } from "../../src/services/submitLocationShop";
import { cacheData } from "../../src/services/indexedDB";
import { AddAShopPayload } from "../../src/types/dataTypes";
import { createLocationShopPayload } from "../../src/services/submitLocationShop";
import { GetShops } from "../../src/services/shopService";
import { submitLocationWithShop } from "../../src/services/shopLocation";

vi.mock("../../src/services/security");
vi.mock("../../src/services/shopLocation");
vi.mock("../../src/services/indexedDB");
vi.mock("../../src/services/shopService");

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
      navigate
    );

    expect(result).toBe(true);
    expect(setShops).toHaveBeenCalledWith(mockShops);
    expect(setLocations).toHaveBeenCalledWith(mockShops[0].locations);
    expect(addToast).toHaveBeenCalledWith(
      "Location and shop submitted successfully!",
      "success"
    );
    expect(cacheData).toHaveBeenCalledWith("shops", mockShops);
    expect(cacheData).toHaveBeenCalledWith("locations", mockShops[0].locations);
  });
});

describe("createLocationShopPayload", () => {
  const validPayload: AddAShopPayload = {
    shopName: "Test Shop",
    shop_description: "A Test Shop Description",
    house_number: "123",
    address: "123 Main St",
    address_first: "Main St",
    address_second: "Apt 4b",
    city: "Test City",
    state: "Ts",
    country: "Test Country",
    postcode: "12345",
    latitude: 40.7128,
    longitude: -74.006,
    categoryIds: [1, 2, 3],
  };

  it("should throw an error if modifiedBy is undefined", () => {
    expect(() => createLocationShopPayload(validPayload, undefined)).toThrow(
      "User ID (modifiedBy) is required to create a shop."
    );
  });

  it("should return the correct location and shop payload for valid inputs", () => {
    const modifiedBy = 1;
    const result = createLocationShopPayload(validPayload, modifiedBy);

    expect(result).toEqual({
      location: {
        street_address: "123 Main St",
        street_address_second: "Apt 4b",
        postal_code: "12345",
        city: "Test City",
        state: "Ts",
        country: "Test Country",
        latitude: 40.7128,
        longitude: -74.006,
        modified_by: modifiedBy,
        date_created: expect.any(String),
        date_modified: expect.any(String),
      },
      shop: {
        name: "Test Shop",
        description: "A Test Shop Description",
        modified_by: modifiedBy,
        created_by: modifiedBy,
      },
      categoryIds: [1, 2, 3],
    });
  });

  it("should use default values if optional fields are missing", () => {
    const modifiedBy = 1;
    const payloadWithMissingFields: AddAShopPayload = {
      shopName: "Shop Without Address",
      shop_description: "No Description Provided",
      house_number: "",
      address: "",
      address_first: "",
      address_second: "",
      city: "",
      state: "",
      country: "",
      postcode: "",
      latitude: 0,
      longitude: 0,
      categoryIds: [],
    };

    const result = createLocationShopPayload(
      payloadWithMissingFields,
      modifiedBy
    );

    expect(result).toEqual({
      location: {
        street_address: "",
        street_address_second: "",
        postal_code: "",
        city: "Unknown City",
        state: "Unknown State",
        country: "Unknown Country",
        latitude: 0,
        longitude: 0,
        modified_by: modifiedBy,
        date_created: expect.any(String),
        date_modified: expect.any(String),
      },
      shop: {
        name: "Shop Without Address",
        description: "No Description Provided",
        modified_by: modifiedBy,
        created_by: modifiedBy,
      },
      categoryIds: [],
    });
  });
});
