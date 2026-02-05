import { screen, waitFor, render } from "@testing-library/react";
import SearchBar from "../../src/components/Search/SearchBar";
import { SearchShops } from "../../src/services/search";
import { useMap } from "../../src/context/mapContext";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import userEvent from "@testing-library/user-event";

// Mock search service
vi.mock("../../src/services/search", () => ({
  SearchShops: vi.fn(),
}));

// Mock context hooks
vi.mock("../../src/context/mapContext", () => ({
  useMap: vi.fn(),
}));

vi.mock("../../src/context/shopContext", () => ({
  useShops: vi.fn(() => ({
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
  })),
}));

vi.mock("../../src/context/toastContext", () => ({
  useToast: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

vi.mock("../../src/context/ShopSidebarContext", () => ({
  useShopSidebar: vi.fn(() => ({
    activeShopId: null,
    setActiveShopId: vi.fn(),
    isOpen: false,
    setIsOpen: vi.fn(),
    openSidebar: vi.fn(),
    closeSidebar: vi.fn(),
  })),
}));

describe("SearchBar", () => {
  const mockFlyToLocation = vi.fn();
  const mockSetShopId = vi.fn();
  const mockSetUserInteracted = vi.fn();

  beforeEach(() => {
    (useMap as jest.Mock).mockReturnValue({
      setShopId: mockSetShopId,
      setUserInteracted: mockSetUserInteracted,
      flyToLocation: mockFlyToLocation,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the search bar input", () => {
    render(<SearchBar />);
    const inputElement = screen.getByPlaceholderText(
      "Search shops, city, category...",
    );
    expect(inputElement).toBeInTheDocument();
  });

  it("fetches and displays suggestions when typing", async () => {
    const mockSuggestions = [
      {
        shop: {
          id: 1,
          name: "Molinari Delicatessen",
        },
        location: {
          street_address: "373 Columbus Ave",
          city: "San Francisco",
          latitude: 37.8,
          longitude: -122.4,
        },
      },
      {
        shop: {
          id: 2,
          name: "Mr Mustache",
        },
        location: {
          street_address: "Flower Street",
          city: "Pasadena",
          latitude: 34.1,
          longitude: -118.1,
        },
      },
    ];

    (SearchShops as jest.Mock).mockResolvedValue(mockSuggestions);

    render(<SearchBar />);

    const input = screen.getByPlaceholderText(
      "Search shops, city, category...",
    );
    await userEvent.type(input, "Shop");

    await waitFor(() => {
      expect(SearchShops).toHaveBeenCalledWith(
        "Shop",
        expect.any(Object),
        false,
        expect.any(Object),
      );
    });

    expect(
      await screen.findByText("Molinari Delicatessen"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Mr Mustache")).toBeInTheDocument();
  });

  it("centers map and sets shopId on suggestion select", async () => {
    const mockSuggestions = [
      {
        shop: {
          id: 1,
          name: "Molinari Delicatessen",
        },
        location: {
          street_address: "373 Columbus Ave",
          city: "San Francisco",
          latitude: 37.8,
          longitude: -122.4,
        },
      },
    ];

    (SearchShops as jest.Mock).mockResolvedValue(mockSuggestions);

    render(<SearchBar />);

    const input = screen.getByPlaceholderText(
      "Search shops, city, category...",
    );
    await userEvent.type(input, "Molinari");

    await waitFor(() =>
      expect(SearchShops).toHaveBeenCalledWith(
        "Molinari",
        expect.any(Object),
        false,
        expect.any(Object),
      ),
    );

    const suggestion = await screen.findByText("Molinari Delicatessen");
    await userEvent.click(suggestion);

    expect(mockFlyToLocation).toHaveBeenCalledWith(-122.4, 37.8, 16);
    expect(mockSetShopId).toHaveBeenCalledWith("1");
    expect(mockSetUserInteracted).toHaveBeenCalledWith(false);
  });
});
