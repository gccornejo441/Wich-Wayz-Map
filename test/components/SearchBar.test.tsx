import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import SearchBar from "../../src/components/Search/SearchBar";
import { SearchShops } from "../../src/services/search";
import { useMap } from "../../src/context/mapContext";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import userEvent from "@testing-library/user-event";

vi.mock("../../src/services/search", () => ({
  SearchShops: vi.fn(),
}));

vi.mock("../../src/context/mapContext", () => ({
  useMap: vi.fn(),
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

  it("renders the search bar", () => {
    render(<SearchBar />);
    const inputElement = screen.getByPlaceholderText("Search shops");
    expect(inputElement).toBeInTheDocument();
  });

  it("renders the search icon", () => {
    render(<SearchBar />);
    const searchIcon = screen.getByRole("img", { hidden: true });
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

    render(<SearchBar />);

    const input = screen.getByPlaceholderText("Search shops");

    userEvent.type(input, "Shop");

    await waitFor(() => {
      expect(SearchShops).toHaveBeenCalledWith("Shop");
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
});
