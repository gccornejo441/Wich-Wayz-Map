import { render, screen } from "@testing-library/react";
import MapSidebar from "../../src/components/Sidebar/MapSidebar";
import { vi } from "vitest";

vi.mock("../../src/context/ShopSidebarContext", () => ({
  useShopSidebar: vi.fn(),
}));

vi.mock("../../src/context/authContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../src/context/voteContext", () => ({
  useVote: vi.fn(),
}));

vi.mock("../../src/context/modalContext", () => ({
  useModal: () => ({ openSignupModal: vi.fn() }),
}));

vi.mock("../../src/context/toastContext", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

import { useShopSidebar } from "../../src/context/ShopSidebarContext";
import { useAuth } from "../../src/context/authContext";
import { useVote } from "../../src/context/voteContext";

describe("MapSidebar location status", () => {
  const baseShop = {
    shopId: 1,
    shopName: "Test Shop",
    address: "123 Main St",
    createdBy: "Tester",
  };

  const sidebarValues = {
    position: [0, 0] as [number, number],
    sidebarOpen: true,
    closeSidebar: vi.fn(),
  };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
    (useVote as jest.Mock).mockReturnValue({
      votes: {},
      addVote: vi.fn(),
      getVotesForShop: vi.fn().mockResolvedValue(undefined),
      submitVote: vi.fn(),
      loadingVotes: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows closed notice when locationOpen is false", () => {
    (useShopSidebar as jest.Mock).mockReturnValue({
      ...sidebarValues,
      selectedShop: { ...baseShop, locationOpen: false },
    });

    render(<MapSidebar />);
    expect(
      screen.getByText("This location is permanently closed."),
    ).toBeInTheDocument();
  });

  it("does not show closed notice when locationOpen is true", () => {
    (useShopSidebar as jest.Mock).mockReturnValue({
      ...sidebarValues,
      selectedShop: { ...baseShop, locationOpen: true },
    });

    render(<MapSidebar />);
    expect(
      screen.queryByText("This location is permanently closed."),
    ).not.toBeInTheDocument();
  });

  it("does not show closed notice when locationOpen is undefined", () => {
    (useShopSidebar as jest.Mock).mockReturnValue({
      ...sidebarValues,
      selectedShop: { ...baseShop },
    });

    render(<MapSidebar />);
    expect(
      screen.queryByText("This location is permanently closed."),
    ).not.toBeInTheDocument();
  });
});
