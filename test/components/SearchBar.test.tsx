import React from "react";
import { render, screen } from "@testing-library/react";
import SearchBar from "../../src/components/Search/SearchBar";
import { useMap } from "../../src/context/mapContext";
import "@testing-library/jest-dom";
import { vi } from "vitest"; // Ensure vi is imported

// Mock the dependencies
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
});
