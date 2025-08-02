import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
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
  address: string;
  onAddressChange: (value: string) => void;
  mode: "add" | "edit";
};

vi.mock("@/components/Form/ShopForm", () => ({
  default: (props: ShopFormProps) => (
    <div data-testid="shop-form">
      {props.mode === "edit" ? "Edit Form" : "Add Form"}
    </div>
  ),
}));
// Mock MapPreview so no map libs run
vi.mock("@/components/Map/MapPreview", () => ({
  default: () => <div data-testid="map-preview">Map Preview</div>,
}));

import { MemoryRouter, useLocation } from "react-router-dom";
import AddEditShop from "@/components/App/AddEditShop";

describe("AddEditShop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Add mode and the 'To Map' button", () => {
    render(
      <MemoryRouter>
        <AddEditShop />
      </MemoryRouter>
    );

    expect(screen.getByText("To Map")).toBeInTheDocument();
    expect(screen.getByText("Add New Shop")).toBeInTheDocument();
    expect(screen.getByTestId("shop-form")).toHaveTextContent("Add Form");
  });

  it("navigates to '/' when 'To Map' is clicked", () => {
    render(
      <MemoryRouter>
        <AddEditShop />
      </MemoryRouter>
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
      </MemoryRouter>
    );

    expect(screen.getByText("Edit Test Shop")).toBeInTheDocument();
    expect(screen.getByTestId("shop-form")).toHaveTextContent("Edit Form");
  });
});
