import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAddShopForm } from "../../src/hooks/useAddShopForm";
import type { AddAShopPayload } from "../../src/types/dataTypes";

const addToast = vi.fn();
const navigate = vi.fn();

// Mock context hooks
vi.mock("@context/shopContext", () => ({
  useShops: () => ({
    shops: [],
    filtered: [],
    displayedShops: [],
    locations: [],
    setShops: vi.fn(),
    setLocations: vi.fn(),
    applyFilters: vi.fn(),
    clearFilters: vi.fn(),
    updateShopInContext: vi.fn(),
    removeShopFromContext: vi.fn(),
  }),
}));

vi.mock("@context/ShopSidebarContext", () => ({
  useShopSidebar: () => ({
    selectedShop: null,
    position: null,
    sidebarOpen: false,
    shopListOpen: false,
    openSidebar: vi.fn(),
    closeSidebar: vi.fn(),
    openShopList: vi.fn(),
    closeShopList: vi.fn(),
    savedShops: [],
    addSavedShop: vi.fn(),
    removeSavedShop: vi.fn(),
    selectShop: vi.fn(),
    selectShopById: vi.fn(),
  }),
}));

vi.mock("@context/toastContext", () => ({
  useToast: () => ({
    addToast,
  }),
}));

vi.mock("@context/authContext", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "test@example.com" },
    userMetadata: { id: 1, role: "user", username: "testuser" },
    isAuthenticated: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const dummyCategories = [{ id: 1, name: "Category1" }];

vi.mock("@/services/categoryService", () => ({
  GetCategories: vi.fn(() => Promise.resolve(dummyCategories)),
}));

describe("useAddShopForm hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches categories on mount", async () => {
    const { result } = renderHook(() => useAddShopForm());
    await waitFor(() => {
      expect(result.current.categories).toEqual(dummyCategories);
    });
  });

  // Used to test if the prefillAddressFields function is called correctly.
  it("shows an error toast when prefillAddressFields is called with an empty address", async () => {
    const { result } = renderHook(() => useAddShopForm());
    await act(async () => {
      await result.current.prefillAddressFields();
    });
    expect(addToast).toHaveBeenCalledWith(
      "Please enter an address to prefill.",
      "error",
    );
  });

  // Used to test error handling in the onSubmit function.
  it("onSubmit shows an error toast when address is not valid", async () => {
    const { result } = renderHook(() => useAddShopForm());
    expect(result.current.isAddressValid).toBe(false);
    const dummyData: AddAShopPayload = {
      shopName: "Test Shop",
      shop_description: "",
      address: "",
      address_first: "",
      address_second: "",
      house_number: "",
      city: "",
      state: "",
      postcode: "",
      country: "",
      latitude: 0,
      longitude: 0,
      categoryIds: [],
    };
    await act(async () => {
      await result.current.onSubmit(dummyData);
    });
    expect(addToast).toHaveBeenCalledWith(
      "Please prefill the address or set coordinates before submitting.",
      "error",
    );
  });
});
