import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createLocationShopPayload,
  handleLocationSubmit,
} from "../../src/services/submitLocationShop";
import * as apiClientModule from "../../src/services/apiClient";
import * as shopServiceModule from "../../src/services/shopService";
import * as indexedDBModule from "../../src/services/indexedDB";
import { AddAShopPayload } from "../../src/types/dataTypes";

let mockCurrentUser: { uid: string; email: string } | null = {
  uid: "test-uid",
  email: "test@example.com",
};

vi.mock("../../src/services/firebase", () => ({
  auth: {
    get currentUser() {
      return mockCurrentUser;
    },
  },
}));

vi.mock("../../src/services/shopService");
vi.mock("../../src/services/apiClient");
vi.mock("../../src/services/indexedDB");

describe("handleLocationSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should require authentication", async () => {
    mockCurrentUser = null;

    const setShops = vi.fn();
    const setLocations = vi.fn();
    const addToast = vi.fn();
    const navigate = vi.fn();

    const result = await handleLocationSubmit(
      {} as AddAShopPayload,
      undefined,
      setShops,
      setLocations,
      addToast,
      navigate,
    );

    expect(result).toBe(false);
    expect(navigate).toHaveBeenCalledWith("/account/sign-in");

    mockCurrentUser = { uid: "test-uid", email: "test@example.com" };
  });

  it("should submit location and shop successfully when authenticated", async () => {
    mockCurrentUser = { uid: "test-uid", email: "test@example.com" };

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

    vi.mocked(apiClientModule.apiRequest).mockResolvedValue({
      shopId: 2,
      locationId: 1,
    });
    vi.mocked(shopServiceModule.GetShops).mockResolvedValue(mockShops);
    vi.mocked(indexedDBModule.cacheData).mockResolvedValue(undefined);

    const setShops = vi.fn();
    const setLocations = vi.fn();
    const addToast = vi.fn();
    const navigate = vi.fn();

    const result = await handleLocationSubmit(
      {} as AddAShopPayload,
      undefined,
      setShops,
      setLocations,
      addToast,
      navigate,
    );

    expect(result).toBe(true);
    expect(setShops).toHaveBeenCalledWith(mockShops);
    expect(setLocations).toHaveBeenCalledWith(mockShops[0].locations);
    expect(addToast).toHaveBeenCalledWith(
      "Location and shop submitted successfully!",
      "success",
    );
    expect(indexedDBModule.cacheData).toHaveBeenCalledWith("shops", mockShops);
    expect(indexedDBModule.cacheData).toHaveBeenCalledWith(
      "locations",
      mockShops[0].locations,
    );
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

  it("should return the correct location and shop payload for valid inputs", () => {
    const result = createLocationShopPayload(validPayload);

    expect(result).toEqual({
      shopName: "Test Shop",
      shop_description: "A test shop description",
      house_number: "",
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

    const result = createLocationShopPayload(payloadWithMissingFields);

    expect(result).toEqual({
      shopName: "Shop Without Address",
      shop_description: "No description provided",
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

    const result = createLocationShopPayload(payloadWithCasingIssues);

    expect(result.shopName).toBe("Test Shop");
    expect(result.shop_description).toBe("This is a test description");
  });
});
