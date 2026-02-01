import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { screen, fireEvent, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
const mockRemoveShopFromContext = vi.fn();
const mockAddToast = vi.fn();

// Mock context hooks
vi.mock("@context/shopContext", () => ({
  useShops: () => ({
    removeShopFromContext: mockRemoveShopFromContext,
    shops: [],
    filtered: [],
    displayedShops: [],
    locations: [],
    setShops: vi.fn(),
    setLocations: vi.fn(),
    applyFilters: vi.fn(),
    clearFilters: vi.fn(),
    updateShopInContext: vi.fn(),
  }),
}));

vi.mock("@context/toastContext", () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

vi.mock("@context/authContext", () => ({
  useAuth: () => ({
    userMetadata: { id: 1, role: "user" },
    isAuthenticated: true,
    user: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock router hooks
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: vi.fn(() => ({ state: undefined })),
  };
});

type InitialData = { shopName: string; address: string };

type ShopFormProps = {
  initialData?: InitialData;
  mode: "add" | "edit";
  layoutMode?: "form-section" | "map-section";
  onDelete?: () => void;
  onNavigateToMap?: () => void;
};

vi.mock("@/components/Form/ShopForm", () => ({
  default: (props: ShopFormProps) => {
    // Only render the form section mock (not the map section duplicate)
    if (props.layoutMode === "map-section") {
      return null;
    }
    
    return (
      <div data-testid="shop-form">
        <div>{props.mode === "edit" ? "Edit Form" : "Add Form"}</div>
        {props.onNavigateToMap && (
          <button onClick={props.onNavigateToMap}>To Map</button>
        )}
      </div>
    );
  },
}));
// Mock MapPreview so no map libs run
vi.mock("@/components/Map/MapPreview", () => ({
  default: () => <div data-testid="map-preview">Map Preview</div>,
}));

import { useLocation } from "react-router-dom";
import AddEditShop from "@/components/App/AddEditShop";

describe("AddEditShop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Add mode and the 'To Map' button", () => {
    render(
      <MemoryRouter>
        <AddEditShop />
      </MemoryRouter>,
    );

    expect(screen.getByText("To Map")).toBeInTheDocument();
    expect(screen.getByTestId("shop-form")).toHaveTextContent("Add Form");
  });

  it("navigates to '/' when 'To Map' is clicked", () => {
    render(
      <MemoryRouter>
        <AddEditShop />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("To Map"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("renders Edit mode when location.state.initialData is provided", () => {
    (useLocation as unknown as Mock).mockReturnValueOnce({
      state: { initialData: { shopName: "Test Shop", address: "123 Main St" } },
    });

    render(
      <MemoryRouter>
        <AddEditShop />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("shop-form")).toHaveTextContent("Edit Form");
  });
});
