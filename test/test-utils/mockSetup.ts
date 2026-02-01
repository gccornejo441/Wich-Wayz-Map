import { vi } from "vitest";

/**
 * Call this function at the top of test files that use renderWithProviders or renderWithRHF.
 * This sets up the necessary mocks for context providers to work in tests.
 */
export function setupProviderMocks() {
  // Mock IndexedDB operations used by ShopsProvider
  vi.mock("@/services/indexedDB", () => ({
    getCachedData: vi.fn().mockResolvedValue([]),
    cacheData: vi.fn().mockResolvedValue(undefined),
    saveData: vi.fn().mockResolvedValue(undefined),
    SHOPS_STORE: "shops",
    LOCATIONS_STORE: "locations",
  }));

  // Mock API client operations used by ShopsProvider
  vi.mock("@/services/apiClient", () => ({
    getLocationCount: vi.fn().mockResolvedValue(0),
    executeQuery: vi.fn().mockResolvedValue({ rows: [] }),
    insertData: vi.fn().mockResolvedValue(undefined),
    updateData: vi.fn().mockResolvedValue(undefined),
  }));

  // Mock ShopService to prevent real API calls
  vi.mock("@/services/shopService", () => ({
    GetShops: vi.fn().mockResolvedValue([]),
    fetchShopById: vi.fn().mockResolvedValue(null),
    updateShopLocationStatus: vi
      .fn()
      .mockResolvedValue({ locationId: 1, locationStatus: "open" }),
  }));
}