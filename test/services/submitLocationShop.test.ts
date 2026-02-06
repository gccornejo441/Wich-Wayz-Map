import { describe, it, expect, vi } from "vitest";
import { handleLocationSubmit } from "../../src/services/submitLocationShop";
import { cacheData } from "../../src/services/indexedDB";
import { AddAShopPayload } from "../../src/types/dataTypes";
import { createLocationShopPayload } from "../../src/services/submitLocationShop";
import { GetShops } from "../../src/services/shopService";
import { getCurrentUser } from "../../src/services/security";
import { apiRequest } from "../../src/services/apiClient";

vi.mock("../../src/services/security");
vi.mock("../../src/services/indexedDB");
vi.mock("../../src/services/shopService");
vi.mock("../../src/services/apiClient");

describe("handleLocationSubmit", () => {
  it("should submit location and shop successfully", async () => {
    // Mock getCurrentUser to return a valid member user
    vi.mocked(getCurrentUser).mockResolvedValue({
      sub: "123",
      membershipStatus: "member",
      email: "test@example.com",
    });

    // Mock apiRequest to return a successful response
    vi.mocked(apiRequest).mockResolvedValue({
      shopId: 2,
      locationId: 1,
    });

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
      undefined, // address parameter
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
      "User ID (modifiedBy) is required to create a shop.",
    );
  });

  it("should return the correct location and shop payload for valid inputs", () => {
    const modifiedBy = 1;
    const result = createLocationShopPayload(validPayload, modifiedBy);

    expect(result).toEqual({
      shopName: "Test Shop",
      shop_description: "A test shop description",
      userId: modifiedBy,
      house_number: "", // Not used with new address structure
      address_first: "Main St",
      address_second: "Apt 4b",
      postcode: "12345",
      city: "Test City",
      state: "TS",
      country: "TEST COUNTRY",
      latitude: 40.7128,
      longitude: -74.006,
      selectedCategoryIds: [1, 2, 3],
      phone: "",
      website_url: "",
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
      modifiedBy,
    );

    expect(result).toEqual({
      shopName: "Shop Without Address",
      shop_description: "No description provided",
      userId: modifiedBy,
      house_number: "",
      address_first: "",
      address_second: "",
      postcode: "",
      city: "Unknown City",
      state: "UNKNOWN STATE",
      country: "UNKNOWN COUNTRY",
      latitude: 0,
      longitude: 0,
      selectedCategoryIds: [],
      phone: "",
      website_url: "",
    });
  });

  it("should ensure shopName is in title case and shop_description is in normal case", () => {
    const modifiedBy = 1;
    const payloadWithCasingIssues = {
      shopName: "tEsT sHoP",
      shop_description: "THIS IS A TEST DESCRIPTION",
      house_number: "456",
      address: "456 Another St",
      address_first: "Another St",
      address_second: "Suite 10",
      city: "Another City",
      state: "AC",
      country: "Another Country",
      postcode: "67890",
      latitude: 34.0522,
      longitude: -118.2437,
      categoryIds: [4, 5, 6],
    };

    const result = createLocationShopPayload(
      payloadWithCasingIssues,
      modifiedBy,
    );

    expect(result.shopName).toBe("Test Shop");
    expect(result.shop_description).toBe("This is a test description");
  });
});

describe("createLocationShopPayload - Edge Cases", () => {
  const modifiedBy = 1;

  it("should handle empty strings for shopName and shop_description", () => {
    const payloadWithEmptyStrings: AddAShopPayload = {
      shopName: "",
      shop_description: "",
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

    const result = createLocationShopPayload(
      payloadWithEmptyStrings,
      modifiedBy,
    );

    expect(result.shopName).toBe("");
    expect(result.shop_description).toBe("No description provided");
  });

  it("should handle special characters in shopName and shop_description", () => {
    const payloadWithSpecialCharacters: AddAShopPayload = {
      shopName: "T3st! Sh@p#123",
      shop_description: "Th!s sh@p descr1ption has #peci@l ch@racters.",
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

    const result = createLocationShopPayload(
      payloadWithSpecialCharacters,
      modifiedBy,
    );

    expect(result.shopName).toBe("T3st! Sh@p#123");
    expect(result.shop_description).toBe(
      "Th!s sh@p descr1ption has #peci@l ch@racters.",
    );
  });

  it("should handle numbers in shopName and shop_description", () => {
    const payloadWithNumbers: AddAShopPayload = {
      shopName: "Shop 1234",
      shop_description: "This shop was established in 2020.",
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

    const result = createLocationShopPayload(payloadWithNumbers, modifiedBy);

    expect(result.shopName).toBe("Shop 1234");
    expect(result.shop_description).toBe("This shop was established in 2020.");
  });

  it("should trim leading and trailing spaces in shopName and shop_description", () => {
    const payloadWithSpaces: AddAShopPayload = {
      shopName: "   Test Shop   ",
      shop_description: "   This is a test description with spaces.   ",
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

    const result = createLocationShopPayload(payloadWithSpaces, modifiedBy);

    expect(result.shopName).toBe("Test Shop");
    expect(result.shop_description).toBe(
      "This is a test description with spaces.",
    );
  });

  it("should handle mixed case input and format correctly", () => {
    const payloadWithMixedCase: AddAShopPayload = {
      shopName: "tEsT sHoP",
      shop_description: "ThIs Is A tEsT dEsCrIpTiOn.",
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

    const result = createLocationShopPayload(payloadWithMixedCase, modifiedBy);

    expect(result.shopName).toBe("Test Shop");
    expect(result.shop_description).toBe("This is a test description.");
  });
});
