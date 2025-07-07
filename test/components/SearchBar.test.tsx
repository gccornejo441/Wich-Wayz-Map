import { render, screen, waitFor } from "@testing-library/react";
import SearchBar from "../../src/components/Search/SearchBar";
import { SearchShops } from "../../src/services/search";
import { useMap } from "../../src/context/mapContext";
import { ToastProvider } from "../../src/context/toastContext";
import { ShopsProvider } from "../../src/context/shopContext";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import userEvent from "@testing-library/user-event";

// Mock services
vi.mock("../../src/services/search", () => ({
  SearchShops: vi.fn(),
}));

vi.mock("../../src/context/mapContext", () => ({
  useMap: vi.fn(),
}));

vi.mock("../../src/context/shopContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/context/shopContext")
  >("../../src/context/shopContext");
  return {
    ...actual,
    useShops: vi.fn(() => ({
      applyFilters: vi.fn(),
    })),
  };
});

vi.mock("../../src/context/toastContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/context/toastContext")
  >("../../src/context/toastContext");
  return {
    ...actual,
    useToast: vi.fn(() => ({
      addToast: vi.fn(),
    })),
  };
});

vi.mock("../../src/services/indexedDB", () => ({
  getCachedData: vi.fn().mockResolvedValue([]),
  saveData: vi.fn(),
}));

describe("SearchBar", () => {
  const mockSetCenter = vi.fn();
  const mockSetShopId = vi.fn();
  const mockSetZoom = vi.fn();
  const mockSetUserInteracted = vi.fn();

  beforeEach(() => {
    (useMap as jest.Mock).mockReturnValue({
      setCenter: mockSetCenter,
      setShopId: mockSetShopId,
      setZoom: mockSetZoom,
      setUserInteracted: mockSetUserInteracted,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = () =>
    render(
      <ShopsProvider>
        <ToastProvider>
          <SearchBar />
        </ToastProvider>
      </ShopsProvider>,
    );

  it("renders the search bar input", () => {
    renderWithProviders();
    const inputElement = screen.getByPlaceholderText("Search shops");
    expect(inputElement).toBeInTheDocument();
  });

  it("fetches and displays suggestions when typing", async () => {
    const mockSuggestions = [
      {
        shop: {
          id: 1,
          name: "Molinari Delicatessen",
          locations: [
            {
              street_address: "373 Columbus Ave",
              city: "San Francisco",
              latitude: 37.8,
              longitude: -122.4,
            },
          ],
        },
      },
      {
        shop: {
          id: 2,
          name: "Mr Mustache",
          locations: [
            {
              street_address: "Flower Street",
              city: "Pasadena",
              latitude: 34.1,
              longitude: -118.1,
            },
          ],
        },
      },
    ];

    (SearchShops as jest.Mock).mockResolvedValue(mockSuggestions);

    renderWithProviders();

    const input = screen.getByPlaceholderText("Search shops");
    await userEvent.type(input, "Shop");

    await waitFor(() => {
      expect(SearchShops).toHaveBeenCalledWith("Shop", expect.any(Object));
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
          locations: [
            {
              street_address: "373 Columbus Ave",
              city: "San Francisco",
              latitude: 37.8,
              longitude: -122.4,
            },
          ],
        },
      },
    ];

    (SearchShops as jest.Mock).mockResolvedValue(mockSuggestions);

    renderWithProviders();

    const input = screen.getByPlaceholderText("Search shops");
    await userEvent.type(input, "Molinari");

    await waitFor(() =>
      expect(SearchShops).toHaveBeenCalledWith("Molinari", expect.any(Object)),
    );

    const suggestion = await screen.findByText("Molinari Delicatessen");
    await userEvent.click(suggestion);

    expect(mockSetCenter).toHaveBeenCalledWith([-122.4, 37.8]);
    expect(mockSetZoom).toHaveBeenCalledWith(16);
    expect(mockSetShopId).toHaveBeenCalledWith("1");
    expect(mockSetUserInteracted).toHaveBeenCalledWith(false);
  });
});
