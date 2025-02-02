import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AddShop from "../../src/components/App/AddShop";
import "@testing-library/jest-dom";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock("../../src/context/shopContext", () => ({
  useShops: () => ({
    setShops: vi.fn(),
    setLocations: vi.fn(),
  }),
}));
vi.mock("../../src/context/toastContext", () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));
vi.mock("../../src/context/authContext", () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));
vi.mock("../../src/services/submitLocationShop", () => ({
  handleLocationSubmit: vi.fn().mockResolvedValue(true),
}));
vi.mock("../../src/services/geolocation", () => ({
  GetCoordinatesAndAddressDetails: vi.fn(),
  MapBoxLocationLookup: vi.fn(),
}));

vi.mock("../../src/services/categoryService", () => ({
  GetCategories: vi.fn().mockResolvedValue([
    { id: 1, category_name: "Category A" },
    { id: 2, category_name: "Category B" },
  ]),
}));

vi.mock("../../src/services/submitLocationShop", () => ({
  handleLocationSubmit: vi.fn().mockResolvedValue(true),
}));

describe("AddShop Component (Single Location)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a single location by default", () => {
    render(<AddShop />);
    expect(screen.getByText("Add A Sandwich Shop")).toBeInTheDocument();
  });
});
