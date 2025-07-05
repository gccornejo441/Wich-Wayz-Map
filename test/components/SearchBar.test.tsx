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

vi.mock("../../src/services/indexedDB", () => ({
  getCachedData: vi.fn().mockResolvedValue([]),
  saveData: vi.fn(),
}));

describe("SearchBar", () => {
  const mockSetCenter = vi.fn();
  const mockSetShopId = vi.fn();
  const mockSetZoom = vi.fn();

  beforeEach(() => {
    (useMap as jest.Mock).mockReturnValue({
      setCenter: mockSetCenter,
      setShopId: mockSetShopId,
      setZoom: mockSetZoom,
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

  it("renders the search bar", () => {
    renderWithProviders();
    const inputElement = screen.getByPlaceholderText("Search shops");
    expect(inputElement).toBeInTheDocument();
  });

  it("renders the search icon", () => {
    renderWithProviders();
    const searchIcon = screen.getByTestId("search-icon");
    expect(searchIcon).toBeInTheDocument();
  });

  it("fetches and displays suggestions when typing", async () => {
    const mockSuggestions = [
      {
        shop: {
          id: 1,
          name: "Molinari Delicatessen",
          locations: [
            { street_address: "373 Columbus Ave", city: "San Francisco" },
          ],
        },
      },
      {
        shop: {
          id: 2,
          name: "Mr Mustache",
          locations: [{ street_address: "Flower Street", city: "Pasadena" }],
        },
      },
    ];

    (SearchShops as jest.Mock).mockResolvedValue(mockSuggestions);

    renderWithProviders();

    const input = screen.getByPlaceholderText("Search shops");
    await userEvent.type(input, "Shop");

    await waitFor(() => {
      expect(SearchShops).toHaveBeenCalledWith({ search: "Shop" });
      expect(screen.getByRole("combobox")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });

    const suggestions = await screen.findAllByText(
      /Molinari Delicatessen|Mr Mustache/,
    );
    expect(suggestions).toHaveLength(2);
  });

  it("ensures accessibility attributes are correctly set", async () => {
    const mockSuggestions = [
      {
        shop: {
          id: 1,
          name: "Molinari Delicatessen",
          locations: [
            { street_address: "373 Columbus Ave", city: "San Francisco" },
          ],
        },
      },
    ];
    (SearchShops as jest.Mock).mockResolvedValue(mockSuggestions);

    renderWithProviders();

    const input = screen.getByPlaceholderText("Search shops");
    await userEvent.type(input, "Molinari");

    await waitFor(() =>
      expect(SearchShops).toHaveBeenCalledWith({ search: "Molinari" }),
    );

    const combobox = screen.getByRole("combobox");
    expect(combobox).toHaveAttribute("aria-expanded", "true");

    const listboxes = screen.getAllByRole("listbox");
    expect(listboxes).toHaveLength(2);
    expect(listboxes[1]).toHaveTextContent("Molinari Delicatessen");
  });
});
