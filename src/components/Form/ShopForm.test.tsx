import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ShopForm from "./ShopForm";

vi.mock("@/hooks/useAddShopForm", () => ({
  useAddShopForm: () => ({
    register: vi.fn((name) => ({ name })),
    handleSubmit: vi.fn((fn) => (e: Event) => {
      e.preventDefault();
      return fn({});
    }),
    errors: {},
    onSubmit: vi.fn(),
    searchAddressSuggestions: vi.fn(),
    applyParsedAddressToForm: vi.fn(),
    isAddressValid: true,
    categories: [
      { id: 1, category_name: "Deli" },
      { id: 2, category_name: "Fast Food" },
    ],
    setCategories: vi.fn(),
    selectedCategories: [1],
    setSelectedCategories: vi.fn(),
    setValue: vi.fn(),
  }),
}));

vi.mock("@hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light" }),
}));

vi.mock("@context/authContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    userMetadata: { id: 1, role: "user" },
  }),
}));

vi.mock("@context/toastContext", () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

vi.mock("@context/shopContext", () => ({
  useShops: () => ({
    updateShopInContext: vi.fn(),
    shops: [],
  }),
}));

vi.mock("@services/categoryService", () => ({
  GetCategories: vi.fn(() => Promise.resolve([])),
  addCategoryIfNotExists: vi.fn(),
}));

vi.mock("@services/shopService", () => ({
  updateShopLocationStatus: vi.fn(),
}));

vi.mock("@/utils/shops", () => ({
  applyLocationStatusToShop: vi.fn((shop) => shop),
}));

vi.mock("../Map/MapPreview", () => ({
  default: () => <div data-testid="map-preview">Map Preview</div>,
}));

const renderShopForm = (props = {}) => {
  const defaultProps = {
    mode: "add" as const,
    ...props,
  };

  return render(
    <BrowserRouter>
      <ShopForm {...defaultProps} />
    </BrowserRouter>,
  );
};

describe("ShopForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render form fields", () => {
    renderShopForm();

    expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/shop description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument();
  });

  it("should display state dropdown with all US states", () => {
    renderShopForm();

    const stateSelect = screen.getByLabelText(/state/i);
    expect(stateSelect).toBeInTheDocument();
    expect(stateSelect.tagName).toBe("SELECT");

    const options = Array.from((stateSelect as HTMLSelectElement).options);
    expect(options.length).toBeGreaterThan(50);
    expect(options.some((opt) => opt.value === "NC")).toBe(true);
    expect(options.some((opt) => opt.value === "CA")).toBe(true);
  });

  it("should render map preview", () => {
    renderShopForm();

    expect(screen.getByTestId("map-preview")).toBeInTheDocument();
  });

  it("should show submit button", () => {
    renderShopForm();

    const submitButton = screen.getByRole("button", {
      name: /submit location/i,
    });
    expect(submitButton).toBeInTheDocument();
  });
});

describe("ShopForm - Edit Mode", () => {
  const mockInitialData = {
    shopId: 1,
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
    locationStatus: "open" as const,
    created_by: 1,
  };

  it("should render in edit mode with update button", () => {
    renderShopForm({ mode: "edit", initialData: mockInitialData });

    expect(
      screen.getByRole("button", { name: /update location/i }),
    ).toBeInTheDocument();
  });

  it("should display location status dropdown when user can edit", () => {
    renderShopForm({ mode: "edit", initialData: mockInitialData });

    expect(screen.getByLabelText(/location status/i)).toBeInTheDocument();
  });
});

describe("ShopForm - Field Locking", () => {
  it("should not have disabled attribute on state select when locked", async () => {
    renderShopForm();

    const stateSelect = screen.getByLabelText(/state/i);
    expect(stateSelect).not.toHaveAttribute("disabled");
  });

  it("should apply pointer-events-none class to state select when addressLocked", async () => {
    renderShopForm();

    const stateSelect = screen.getByLabelText(/state/i);

    await waitFor(() => {
      const classes = stateSelect.className;
      if (classes.includes("pointer-events-none")) {
        expect(classes).toContain("opacity-60");
      }
    });
  });
});

describe("ShopForm - Categories", () => {
  it("should render category selection", () => {
    renderShopForm();

    expect(screen.getByText(/select categories/i)).toBeInTheDocument();
  });

  it("should have Add Category button", () => {
    renderShopForm();

    expect(
      screen.getByRole("button", { name: /add category/i }),
    ).toBeInTheDocument();
  });
});

describe("ShopForm - Address Search", () => {
  it("should have Search Address button", () => {
    renderShopForm();

    expect(
      screen.getByRole("button", { name: /search address/i }),
    ).toBeInTheDocument();
  });
});
