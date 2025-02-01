import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAddShopForm } from "../../src/hooks/useAddShopForm";
import type { AddAShopPayload } from "../../src/types/dataTypes";

type MockSetter = (value: unknown) => void;
type MockToast = (message: string, type: string) => void;
type MockLogout = () => void;
type MockNavigate = (path: string) => void;

const setShops: MockSetter = vi.fn();
const setLocations: MockSetter = vi.fn();
const addToast: MockToast = vi.fn();
const logout: MockLogout = vi.fn();
const navigate: MockNavigate = vi.fn();

vi.mock("@context/shopContext", () => ({
  useShops: () => ({
    setShops,
    setLocations,
  }),
}));

vi.mock("@context/toastContext", () => ({
  useToast: () => ({
    addToast,
  }),
}));

vi.mock("@context/authContext", () => ({
  useAuth: () => ({
    logout,
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

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

  // Tests to see if manually entering an address works correctly.
  it("toggles manual entry state and sets address validity", () => {
    const { result } = renderHook(() => useAddShopForm());
    expect(result.current.isManualEntry).toBe(false);
    act(() => {
      result.current.handledManualEntry();
    });
    expect(result.current.isManualEntry).toBe(true);
    expect(result.current.isAddressValid).toBe(false);
  });

  // Used to test if the prefillAddressFields function is called correctly.
  it("shows an error toast when prefillAddressFields is called with an empty address", async () => {
    const { result } = renderHook(() => useAddShopForm());
    await act(async () => {
      await result.current.prefillAddressFields();
    });
    expect(addToast).toHaveBeenCalledWith(
      "Please enter an address to prefill.",
      "error"
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
      "Please prefill and validate the address before submitting.",
      "error"
    );
  });

});
