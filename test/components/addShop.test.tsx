import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AddShop from "@/components/Modal/AddShop";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("AddShop Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Add Shop form and back button", () => {
    render(<AddShop />);
    expect(screen.getByText("Back to Map")).toBeInTheDocument();
    expect(screen.getByTitle("Add Shop Form")).toBeInTheDocument();
  });

  it("calls navigate('/') when 'Back to Map' button is clicked", () => {
    render(<AddShop />);
    const backButton = screen.getByText("Back to Map");
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
