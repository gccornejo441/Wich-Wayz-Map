import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createLocationShopPayload,
  handleLocationSubmit,
} from "../../src/services/submitLocationShop";
import * as apiClientModule from "../../src/services/apiClient";
import * as shopServiceModule from "../../src/services/shopService";
import * as indexedDBModule from "../../src/services/indexedDB";
import { AddAShopPayload } from "../../src/types/dataTypes";
import { ShopGeoJsonProperties } from "../../src/utils/shopGeoJson";

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

    vi.mocked(apiClientModule.authApiRequest).mockResolvedValue({
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

  // REGRESSION TEST: Ensure authApiRequest is used, not apiRequest
  it("should use authApiRequest with authorization headers", async () => {
    mockCurrentUser = { uid: "test-uid", email: "test@example.com" };

    const mockShops = [
      {
        id: 1,
        name: "New Shop",
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

    vi.mocked(apiClientModule.authApiRequest).mockResolvedValue({
      shopId: 1,
      locationId: 1,
    });
    vi.mocked(shopServiceModule.GetShops).mockResolvedValue(mockShops);
    vi.mocked(indexedDBModule.cacheData).mockResolvedValue(undefined);

    const setShops = vi.fn();
    const setLocations = vi.fn();
    const addToast = vi.fn();
    const navigate = vi.fn();

    await handleLocationSubmit(
      {} as AddAShopPayload,
      undefined,
      setShops,
      setLocations,
      addToast,
      navigate,
    );

    // CRITICAL: Must use authApiRequest, not apiRequest
    expect(apiClientModule.authApiRequest).toHaveBeenCalledWith(
      "/add-new-shop",
      expect.objectContaining({
        method: "POST",
      }),
    );

    // Ensure apiRequest is NOT called
    expect(apiClientModule.apiRequest).not.toHaveBeenCalled();
  });

  // REGRESSION TEST: Ensure selectShop uses locally fetched data
  it("should select newly created shop using locally fetched data, not fetchShopById", async () => {
    mockCurrentUser = { uid: "test-uid", email: "test@example.com" };

    const mockShops = [
      {
        id: 42,
        name: "Newly Created Shop",
        description: "Test description",
        created_by: 123,
        created_by_username: "testuser",
        users_avatar_id: "5",
        categories: [
          { id: 1, category_name: "Deli" },
          { id: 2, category_name: "Sandwich" },
        ],
        locations: [
          {
            id: 10,
            postal_code: "10001",
            latitude: 40.7589,
            longitude: -73.9851,
            street_address: "456 Broadway",
            street_address_second: "Suite 200",
            city: "New York",
            state: "NY",
            country: "USA",
            phone: "555-1234",
            website: "https://example.com",
            locationStatus: "open" as const,
          },
        ],
      },
    ];

    vi.mocked(apiClientModule.authApiRequest).mockResolvedValue({
      shopId: 42,
      locationId: 10,
    });
    vi.mocked(shopServiceModule.GetShops).mockResolvedValue(mockShops);
    vi.mocked(indexedDBModule.cacheData).mockResolvedValue(undefined);

    const setShops = vi.fn();
    const setLocations = vi.fn();
    const addToast = vi.fn();
    const navigate = vi.fn();
    const selectShop = vi.fn();

    const result = await handleLocationSubmit(
      {} as AddAShopPayload,
      undefined,
      setShops,
      setLocations,
      addToast,
      navigate,
      selectShop,
    );

    expect(result).toBe(true);

    // CRITICAL: selectShop should be called with the shop data
    expect(selectShop).toHaveBeenCalledTimes(1);

    const calledShop = selectShop.mock.calls[0][0] as ShopGeoJsonProperties;

    // Verify the shop data structure is correct
    expect(calledShop).toMatchObject({
      shopId: 42,
      shopName: "Newly Created Shop",
      description: "Test description",
      categories: "Deli, Sandwich",
      categoryIds: [1, 2],
      address: "456 Broadway, Suite 200",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "USA",
      latitude: 40.7589,
      longitude: -73.9851,
      phone: "555-1234",
      website: "https://example.com",
      website_url: "https://example.com",
      createdBy: "testuser",
      created_by: 123,
      usersAvatarId: "5",
      locationStatus: "open",
      locationId: 10,
    });

    // CRITICAL: fetchShopById should NOT be called (no extra API request)
    expect(shopServiceModule.fetchShopById).not.toHaveBeenCalled();
  });

  // REGRESSION TEST: Handle case when shop has no location
  it("should not call selectShop if newly created shop has no location", async () => {
    mockCurrentUser = { uid: "test-uid", email: "test@example.com" };

    const mockShops = [
      {
        id: 50,
        name: "Shop Without Location",
        created_by: 123,
        locations: [], // No locations
      },
    ];

    vi.mocked(apiClientModule.authApiRequest).mockResolvedValue({
      shopId: 50,
      locationId: 1,
    });
    vi.mocked(shopServiceModule.GetShops).mockResolvedValue(mockShops);
    vi.mocked(indexedDBModule.cacheData).mockResolvedValue(undefined);

    const setShops = vi.fn();
    const setLocations = vi.fn();
    const addToast = vi.fn();
    const navigate = vi.fn();
    const selectShop = vi.fn();

    const result = await handleLocationSubmit(
      {} as AddAShopPayload,
      undefined,
      setShops,
      setLocations,
      addToast,
      navigate,
      selectShop,
    );

    expect(result).toBe(true);
    // Should not call selectShop when shop has no location
    expect(selectShop).not.toHaveBeenCalled();
  });

  // REGRESSION TEST: Handle case when shop is not found in fetched data
  it("should not call selectShop if newly created shop is not found in fetched data", async () => {
    mockCurrentUser = { uid: "test-uid", email: "test@example.com" };

    const mockShops = [
      {
        id: 99, // Different ID than the one returned
        name: "Different Shop",
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

    vi.mocked(apiClientModule.authApiRequest).mockResolvedValue({
      shopId: 42, // Shop with this ID doesn't exist in mockShops
      locationId: 1,
    });
    vi.mocked(shopServiceModule.GetShops).mockResolvedValue(mockShops);
    vi.mocked(indexedDBModule.cacheData).mockResolvedValue(undefined);

    const setShops = vi.fn();
    const setLocations = vi.fn();
    const addToast = vi.fn();
    const navigate = vi.fn();
    const selectShop = vi.fn();

    const result = await handleLocationSubmit(
      {} as AddAShopPayload,
      undefined,
      setShops,
      setLocations,
      addToast,
      navigate,
      selectShop,
    );

    expect(result).toBe(true);
    // Should not call selectShop when shop is not found
    expect(selectShop).not.toHaveBeenCalled();
  });

  // REGRESSION TEST: Should not throw error if selectShop fails
  it("should handle selectShop errors gracefully without failing submission", async () => {
    mockCurrentUser = { uid: "test-uid", email: "test@example.com" };

    const mockShops = [
      {
        id: 42,
        name: "Test Shop",
        created_by: 123,
        categories: [{ id: 1, category_name: "Deli" }],
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

    vi.mocked(apiClientModule.authApiRequest).mockResolvedValue({
      shopId: 42,
      locationId: 1,
    });
    vi.mocked(shopServiceModule.GetShops).mockResolvedValue(mockShops);
    vi.mocked(indexedDBModule.cacheData).mockResolvedValue(undefined);

    const setShops = vi.fn();
    const setLocations = vi.fn();
    const addToast = vi.fn();
    const navigate = vi.fn();
    const selectShop = vi.fn().mockImplementation(() => {
      throw new Error("SelectShop failed");
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await handleLocationSubmit(
      {} as AddAShopPayload,
      undefined,
      setShops,
      setLocations,
      addToast,
      navigate,
      selectShop,
    );

    // Should still return true - shop was created successfully
    expect(result).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to select newly created shop:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
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
