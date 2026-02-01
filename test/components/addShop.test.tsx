import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import AddShop from "@/components/Modal/AddShop";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("AddShop Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Add Shop form and back button", () => {
    render(
      <MemoryRouter>
        <AddShop />
      </MemoryRouter>,
    );
    expect(screen.getByText("Back to Map")).toBeInTheDocument();
    expect(screen.getByTitle("Add Shop Form")).toBeInTheDocument();
  });

  it("calls navigate('/') when 'Back to Map' button is clicked", () => {
    render(
      <MemoryRouter>
        <AddShop />
      </MemoryRouter>,
    );
    const backButton = screen.getByText("Back to Map");
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
