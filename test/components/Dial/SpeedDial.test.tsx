import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import SpeedDial from "@/components/Dial/SpeedDial";
import { OverlayProvider } from "@context/overlayContext";

// Mock the auth context
vi.mock("@context/authContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { emailVerified: true },
    userMetadata: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock indexedDB refresh
vi.mock("@/services/indexedDB", () => ({
  refreshCache: vi.fn(() => Promise.resolve()),
}));

describe("SpeedDial", () => {
  const mockOnLocateUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSpeedDial = () => {
    return render(
      <BrowserRouter>
        <OverlayProvider>
          <SpeedDial onLocateUser={mockOnLocateUser} />
        </OverlayProvider>
      </BrowserRouter>,
    );
  };

  it("renders the speed dial button", () => {
    renderSpeedDial();

    const button = screen.getByRole("button", { name: /open actions menu/i });
    expect(button).toBeInTheDocument();
  });

  it("has pointer-events-none on the container to allow map gestures", () => {
    const { container } = renderSpeedDial();

    // Find the fixed container div (first child of the root)
    const speedDialContainer = container.firstChild as HTMLElement;
    expect(speedDialContainer).toHaveClass("pointer-events-none");
  });

  it("has pointer-events-auto on the menu to receive interactions", () => {
    const { container } = renderSpeedDial();

    // Find the menu div (second child of the container)
    const speedDialContainer = container.firstChild as HTMLElement;
    const menuDiv = speedDialContainer.firstChild as HTMLElement;
    expect(menuDiv).toHaveClass("pointer-events-auto");
  });

  it("has pointer-events-auto and touch-manipulation on the main button", () => {
    renderSpeedDial();

    const button = screen.getByRole("button", { name: /open actions menu/i });
    expect(button).toHaveClass("pointer-events-auto");
    expect(button).toHaveClass("touch-manipulation");
  });

  it("opens the menu when button is clicked", () => {
    const { container } = renderSpeedDial();

    const button = screen.getByRole("button", { name: /open actions menu/i });
    const speedDialContainer = container.firstChild as HTMLElement;
    const menuDiv = speedDialContainer.firstChild as HTMLElement;
    expect(menuDiv).toHaveClass("opacity-0");

    // Click to open
    fireEvent.click(button);

    // After clicking, menu should be visible (opacity-100)
    expect(menuDiv).toHaveClass("opacity-100");
  });

  it("displays menu items when opened", () => {
    renderSpeedDial();

    const button = screen.getByRole("button", { name: /open actions menu/i });
    fireEvent.click(button);

    // Check for menu items
    expect(screen.getByText("Add Shop")).toBeInTheDocument();
    expect(screen.getByText("Copy Link")).toBeInTheDocument();
    expect(screen.getByText("Donate")).toBeInTheDocument();
    expect(screen.getByText("Refresh Map")).toBeInTheDocument();
    expect(screen.getByText("My Location")).toBeInTheDocument();
  });

  it("calls onLocateUser when My Location is clicked", () => {
    renderSpeedDial();

    const button = screen.getByRole("button", { name: /open actions menu/i });
    fireEvent.click(button);

    const myLocationButton = screen.getByText("My Location");
    fireEvent.click(myLocationButton);

    expect(mockOnLocateUser).toHaveBeenCalledTimes(1);
  });

  it("closes the menu when button is clicked again", () => {
    const { container } = renderSpeedDial();

    const button = screen.getByRole("button", { name: /open actions menu/i });
    const speedDialContainer = container.firstChild as HTMLElement;
    const menuDiv = speedDialContainer.firstChild as HTMLElement;

    // Open menu
    fireEvent.click(button);
    expect(menuDiv).toHaveClass("opacity-100");

    // Close menu
    fireEvent.click(button);
    expect(menuDiv).toHaveClass("opacity-0");
  });
});
