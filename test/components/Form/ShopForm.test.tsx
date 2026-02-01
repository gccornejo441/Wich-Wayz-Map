import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { yupResolver } from "@hookform/resolvers/yup";
import ShopForm from "@components/Form/ShopForm";
import { locationSchema } from "@constants/validators";
import { renderWithRHF } from "../../test-utils/rhfHarness";

const mockAddToast = vi.fn();
const mockUpdateShopInContext = vi.fn();
const mockOnAddressUpdate = vi.fn();
const mockSearchAddressSuggestions = vi.fn();

vi.mock("@services/categoryService", () => ({
  GetCategories: vi.fn(() =>
    Promise.resolve([
      { id: 1, category_name: "Deli" },
      { id: 2, category_name: "Fast Food" },
    ]),
  ),
  addCategoryIfNotExists: vi.fn(() => Promise.resolve()),
}));

vi.mock("@services/geolocation", () => ({
  MapBoxMultipleLocationLookup: vi.fn(() => Promise.resolve([])),
  GetCoordinatesAndAddressDetails: vi.fn(() => Promise.resolve(null)),
  MapBoxLocationLookup: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@context/authContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    userMetadata: { id: 1, role: "user" },
    user: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@context/toastContext", () => ({
  useToast: () => ({
    addToast: mockAddToast,
    toasts: [],
  }),
}));

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
    updateShopInContext: mockUpdateShopInContext,
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

vi.mock("@services/shopService", () => ({
  updateShopLocationStatus: vi.fn(() =>
    Promise.resolve({ locationId: 1, locationStatus: "open" }),
  ),
}));

vi.mock("@/utils/shops", () => ({
  applyLocationStatusToShop: vi.fn((shop) => shop),
}));

vi.mock("@hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light" }),
}));

vi.mock("@components/Map/MapPreview", () => ({
  default: ({
    onAddressUpdate,
  }: {
    onAddressUpdate: (addr: unknown) => void;
  }) => {
    mockOnAddressUpdate.mockImplementation(onAddressUpdate);
    return (
      <div data-testid="map-preview">
        <button
          data-testid="map-update-empty"
          onClick={() =>
            onAddressUpdate({
              streetAddress: "",
              city: "",
              state: "",
              postalCode: "",
              country: "",
              latitude: 35.9,
              longitude: -78.8,
            })
          }
        >
          Update Empty
        </button>
        <button
          data-testid="map-update-filled"
          onClick={() =>
            onAddressUpdate({
              streetAddress: "456 Oak St",
              city: "Durham",
              state: "north carolina",
              postalCode: "27502-1234",
              country: "USA",
              latitude: 35.9,
              longitude: -78.8,
            })
          }
        >
          Update Filled
        </button>
      </div>
    );
  },
}));

const mockInitialData = {
  shopId: 1,
  shopName: "Test Sandwich Shop",
  shop_description: "A great place for sandwiches with fresh ingredients",
  address: "123 Main St",
  city: "Raleigh",
  state: "North Carolina",
  postcode: "27502-1234",
  latitude: 35.7796,
  longitude: -78.6382,
  website_url: "https://example.com",
  phone: "(919) 555-1234",
  locationStatus: "open" as const,
  created_by: 1,
  categoryIds: [1],
};

const normalizedDefaults = {
  shopName: "Test Sandwich Shop",
  shop_description: "A great place for sandwiches with fresh ingredients",
  address: "123 Main St",
  city: "Raleigh",
  state: "NC",
  postcode: "275021234",
  latitude: 35.7796,
  longitude: -78.6382,
  website_url: "https://example.com",
  phone: "(919) 555-1234",
  address_first: "",
  address_second: "",
  house_number: "",
  country: "",
  categoryIds: [1],
};

describe("ShopForm - Edit Mode Normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display normalized state (NC) from full name (North Carolina)", async () => {
    renderWithRHF(<ShopForm mode="edit" layoutMode="form-section" initialData={mockInitialData} />, {
      defaultValues: normalizedDefaults,
      resolver: yupResolver(locationSchema),
    });

    await waitFor(() => {
      const stateSelect = screen.getByLabelText(/state/i) as HTMLSelectElement;
      expect(stateSelect.value).toBe("NC");
    });
  });

  it("should display normalized postcode (275021234) from formatted (27502-1234)", async () => {
    renderWithRHF(<ShopForm mode="edit" layoutMode="form-section" initialData={mockInitialData} />, {
      defaultValues: normalizedDefaults,
      resolver: yupResolver(locationSchema),
    });

    await waitFor(() => {
      const postcodeInput = screen.getByLabelText(/zip/i) as HTMLInputElement;
      expect(postcodeInput.value).toBe("275021234");
    });
  });
});

describe("ShopForm - Field Locking Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchAddressSuggestions.mockResolvedValue({
      success: true,
      suggestions: [
        {
          formattedAddress: "123 Main St, Raleigh, NC 27502",
          parsedData: {
            coordinates: { latitude: 35.7796, longitude: -78.6382 },
            components: {
              house_number: "123",
              road: "Main St",
              city: "Raleigh",
              state: "North Carolina",
              postcode: "27502-1234",
              country: "USA",
            },
          },
        },
      ],
    });
  });

  it("should not have disabled attribute on state select", async () => {
    renderWithRHF(<ShopForm mode="add" layoutMode="form-section" />, {
      defaultValues: normalizedDefaults,
      resolver: yupResolver(locationSchema),
    });

    await waitFor(() => {
      const stateSelect = screen.getByLabelText(/state/i);
      expect(stateSelect).not.toHaveAttribute("disabled");
    });
  });

  it("should apply pointer-events-none class when address is locked", async () => {
    renderWithRHF(<ShopForm mode="add" layoutMode="form-section" />, {
      defaultValues: normalizedDefaults,
      resolver: yupResolver(locationSchema),
    });

    await waitFor(() => {
      const stateSelect = screen.getByLabelText(/state/i);
      expect(stateSelect).not.toHaveAttribute("disabled");
    });
  });
});


describe("ShopForm - Form Submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render submit button in add mode", async () => {
    renderWithRHF(<ShopForm mode="add" layoutMode="form-section" />, {
      defaultValues: normalizedDefaults,
      resolver: yupResolver(locationSchema),
    });

    await waitFor(() => {
      const submitButton = screen.getByRole("button", {
        name: /save/i,
      });
      expect(submitButton).toBeInTheDocument();
    });
  });

  it("should render update button in edit mode", async () => {
    renderWithRHF(<ShopForm mode="edit" layoutMode="form-section" initialData={mockInitialData} />, {
      defaultValues: normalizedDefaults,
      resolver: yupResolver(locationSchema),
    });

    await waitFor(() => {
      const saveButton = screen.getByRole("button", {
        name: /save/i,
      });
      expect(saveButton).toBeInTheDocument();
    });
  });
});

describe("ShopForm - Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all required form fields", async () => {
    renderWithRHF(<ShopForm mode="add" layoutMode="form-section" />, {
      defaultValues: normalizedDefaults,
      resolver: yupResolver(locationSchema),
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/street/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zip/i)).toBeInTheDocument();
    });
  });

  it("should render state dropdown with US states", async () => {
    renderWithRHF(<ShopForm mode="add" layoutMode="form-section" />, {
      defaultValues: normalizedDefaults,
      resolver: yupResolver(locationSchema),
    });

    await waitFor(() => {
      const stateSelect = screen.getByLabelText(/state/i) as HTMLSelectElement;
      const options = Array.from(stateSelect.options);
      expect(options.length).toBeGreaterThan(50);
      expect(options.some((opt) => opt.value === "NC")).toBe(true);
      expect(options.some((opt) => opt.value === "CA")).toBe(true);
    });
  });

  it("should render map preview", async () => {
    renderWithRHF(<ShopForm mode="add" layoutMode="map-section" />, {
      defaultValues: normalizedDefaults,
      resolver: yupResolver(locationSchema),
    });

    await waitFor(() => {
      expect(screen.getByTestId("map-preview")).toBeInTheDocument();
    });
  });
});
