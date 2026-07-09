import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

import ShopForm from "@components/Form/ShopForm";
import { ShopWithUser } from "@models/ShopWithUser";

const mockState = vi.hoisted(() => ({
  shops: [] as ShopWithUser[],
  submitSuccess: true,
  handleLocationSubmit: vi.fn(),
  addToast: vi.fn(),
  setShops: vi.fn(),
  setLocations: vi.fn(),
  selectShop: vi.fn(),
  updateShopInContext: vi.fn(),
  mapBoxMultipleLocationLookup: vi.fn(),
}));

vi.mock("@context/shopContext", () => ({
  useShops: () => ({
    shops: mockState.shops,
    filtered: [],
    displayedShops: mockState.shops,
    locations: [],
    setShops: mockState.setShops,
    setLocations: mockState.setLocations,
    applyFilters: vi.fn(),
    clearFilters: vi.fn(),
    updateShopInContext: mockState.updateShopInContext,
    removeShopFromContext: vi.fn(),
    refreshShops: vi.fn(),
  }),
}));

vi.mock("@context/toastContext", () => ({
  useToast: () => ({ addToast: mockState.addToast }),
}));

vi.mock("@context/authContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    userMetadata: { id: 42, role: "user" },
  }),
}));

vi.mock("@context/ShopSidebarContext", () => ({
  useShopSidebar: () => ({ selectShop: mockState.selectShop }),
}));

vi.mock("@hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light" }),
}));

vi.mock("@hooks/useRecaptcha", () => ({
  useRecaptcha: () => ({
    executeRecaptcha: vi.fn(),
    isReady: false,
  }),
}));

vi.mock("@/services/firebase", () => ({
  auth: { currentUser: { uid: "firebase-user" } },
}));

vi.mock("@/services/categoryService", () => ({
  GetCategories: vi.fn(() =>
    Promise.resolve([{ id: 1, category_name: "Deli" }]),
  ),
  addCategoryIfNotExists: vi.fn(() =>
    Promise.resolve({ id: 2, category_name: "Cafe" }),
  ),
}));

vi.mock("@/services/geolocation", () => ({
  GetCoordinatesAndAddressDetails: vi.fn(),
  MapBoxLocationLookup: vi.fn(),
  MapBoxMultipleLocationLookup: (...args: unknown[]) =>
    mockState.mapBoxMultipleLocationLookup(...args),
}));

vi.mock("@/services/submitLocationShop", () => ({
  handleLocationSubmit: (...args: unknown[]) => {
    mockState.handleLocationSubmit(...args);
    return Promise.resolve(mockState.submitSuccess);
  },
}));

vi.mock("@services/shopService", () => ({
  updateShopLocationStatus: vi.fn(),
}));

vi.mock("@/utils/shops", () => ({
  applyLocationStatusToShop: vi.fn((shop) => shop),
}));

vi.mock("@components/Map/MapPreview", () => ({
  default: ({
    onAddressUpdate,
    interactive = true,
  }: {
    onAddressUpdate: (next: {
      streetAddress: string;
      streetAddressSecond: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      latitude: number;
      longitude: number;
    }) => void;
    interactive?: boolean;
  }) => (
    <div
      data-testid={interactive ? "main-map-preview" : "readonly-map-preview"}
    >
      {interactive ? (
        <>
          <button
            type="button"
            onClick={() =>
              onAddressUpdate({
                streetAddress: "123 Main St",
                streetAddressSecond: "",
                city: "Raleigh",
                state: "NC",
                postalCode: "27601",
                country: "US",
                latitude: 35,
                longitude: -78,
              })
            }
          >
            Set map location
          </button>
          <button
            type="button"
            onClick={() =>
              onAddressUpdate({
                streetAddress: "125 Main St",
                streetAddressSecond: "",
                city: "Raleigh",
                state: "NC",
                postalCode: "27601",
                country: "US",
                latitude: 35.0004,
                longitude: -78,
              })
            }
          >
            Move map location
          </button>
        </>
      ) : null}
    </div>
  ),
}));

vi.mock("@components/Modal/AddCategoryModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="add-category-modal" /> : null,
}));

vi.mock("react-select", () => ({
  default: ({
    value,
    onChange,
    options,
  }: {
    value?: Array<{ value: number; label: string }>;
    onChange: (selected: Array<{ value: number; label: string }>) => void;
    options?: Array<{ value: number; label: string }>;
  }) => (
    <div>
      <span data-testid="selected-categories">
        {value?.map((option) => option.label).join(", ") ?? ""}
      </span>
      <button
        type="button"
        onClick={() => onChange(options?.[0] ? [options[0]] : [])}
      >
        Select Deli
      </button>
    </div>
  ),
}));

vi.mock("@react-input/mask", () => ({
  InputMask: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

const draftKey = "wich-wayz-add-shop-draft:42";

const renderShopForm = (mode: "add" | "edit" = "add") =>
  render(
    <MemoryRouter>
      <ShopForm
        mode={mode}
        layoutMode={mode === "add" ? "map-section" : "form-section"}
        initialData={
          mode === "edit"
            ? {
                shopId: 1,
                shopName: "Existing Shop",
                shop_description: "Existing shop with a long description",
                address: "1 Existing St",
                city: "Raleigh",
                state: "NC",
                postcode: "27601",
                latitude: 35,
                longitude: -78,
                categoryIds: [1],
              }
            : undefined
        }
      />
    </MemoryRouter>,
  );

const fillRequiredAddFields = async () => {
  fireEvent.change(screen.getByLabelText(/shop name/i), {
    target: { value: "Tony Deli" },
  });
  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: "A neighborhood sandwich shop with fresh daily bread." },
  });
  fireEvent.click(await screen.findByRole("button", { name: /select deli/i }));
  fireEvent.click(screen.getByRole("button", { name: /set map location/i }));
};

describe("ShopForm map-section hardening", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockState.shops = [];
    mockState.submitSuccess = true;
    mockState.mapBoxMultipleLocationLookup.mockResolvedValue([
      {
        formattedAddress: "123 Main St, Raleigh, NC 27601",
        coordinates: { latitude: 35, longitude: -78 },
        components: {
          house_number: "123",
          street: "Main St",
          city: "Raleigh",
          state: "NC",
          postcode: "27601",
          country: "US",
        },
      },
    ]);
  });

  it("saves, restores, and clears add-mode drafts", async () => {
    const { unmount } = renderShopForm();

    fireEvent.change(screen.getByLabelText(/shop name/i), {
      target: { value: "Draft Deli" },
    });

    await waitFor(() => {
      expect(localStorage.getItem(draftKey)).toContain("Draft Deli");
    });

    unmount();
    renderShopForm();

    expect(await screen.findByDisplayValue("Draft Deli")).toBeInTheDocument();
    expect(
      screen.getByText(/restored your unsent shop draft/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear draft/i }));
    expect(localStorage.getItem(draftKey)).toBeNull();
    expect(
      screen.queryByText(/restored your unsent shop draft/i),
    ).not.toBeInTheDocument();
  });

  it("starts with manual address fields and recalculates the pin from typed address", async () => {
    renderShopForm();

    expect(screen.getByLabelText(/street/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /recalculate pin from address/i }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/street/i), {
      target: { value: "123 Main St" },
    });
    fireEvent.change(screen.getByLabelText(/city/i), {
      target: { value: "Raleigh" },
    });
    fireEvent.change(screen.getByLabelText(/state/i), {
      target: { value: "NC" },
    });
    fireEvent.change(screen.getByLabelText(/zip/i), {
      target: { value: "27601" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /recalculate pin from address/i }),
    );

    await waitFor(() => {
      expect(mockState.mapBoxMultipleLocationLookup).toHaveBeenCalled();
      expect(screen.getByText(/location confirmed/i)).toBeInTheDocument();
      expect(
        screen.getAllByText(/123 Main St, Raleigh, NC, 27601, US/i).length,
      ).toBeGreaterThan(0);
    });
  });

  it("preserves a typed suite number when recalculating the pin", async () => {
    mockState.mapBoxMultipleLocationLookup.mockResolvedValue([
      {
        formattedAddress: "1101 West Gate City Boulevard, Greensboro, NC 27403",
        coordinates: { latitude: 36.062, longitude: -79.805 },
        components: {
          house_number: "1101",
          street: "West Gate City Boulevard",
          city: "Greensboro",
          state: "NC",
          postcode: "27403",
          country: "US",
        },
      },
    ]);

    renderShopForm();

    fireEvent.change(screen.getByLabelText(/street/i), {
      target: { value: "1101 W Gate City Blvd #201" },
    });
    fireEvent.change(screen.getByLabelText(/city/i), {
      target: { value: "Greensboro" },
    });
    fireEvent.change(screen.getByLabelText(/state/i), {
      target: { value: "NC" },
    });
    fireEvent.change(screen.getByLabelText(/zip/i), {
      target: { value: "27403" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /recalculate pin from address/i }),
    );

    await waitFor(() => {
      expect(mockState.mapBoxMultipleLocationLookup).toHaveBeenCalledWith(
        "1101 W Gate City Blvd Greensboro NC 27403",
        expect.any(Object),
      );
      expect(
        screen.getAllByText(
          /1101 West Gate City Boulevard, #201, Greensboro, NC, 27403, US/i,
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  it("shows duplicate warning, dismisses by signature, and shows it again after pin changes", async () => {
    mockState.shops = [
      {
        id: 7,
        name: "Tony Deli",
        created_by: 1,
        locations: [
          {
            id: 70,
            street_address: "123 Main St",
            city: "Raleigh",
            state: "NC",
            postal_code: "27601",
            country: "US",
            latitude: 35.0002,
            longitude: -78,
          },
        ],
      },
    ];

    renderShopForm();
    await fillRequiredAddFields();

    expect(
      await screen.findByText(/possible match nearby: Tony Deli/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continue anyway/i }));
    expect(
      screen.queryByText(/possible match nearby: Tony Deli/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /move map location/i }));
    expect(
      await screen.findByText(/possible match nearby: Tony Deli/i),
    ).toBeInTheDocument();
  });

  it("blocks large-chain submissions but allows unsure submissions for review", async () => {
    renderShopForm();
    await fillRequiredAddFields();

    fireEvent.click(
      screen.getByRole("button", { name: /no, it is a large chain/i }),
    );
    expect(
      screen.getByRole("button", { name: /submit for review/i }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /i'm not sure/i }));
    expect(
      screen.getByText(/the review step will verify eligibility/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => {
      expect(mockState.handleLocationSubmit).toHaveBeenCalled();
    });

    const submittedPayload = mockState.handleLocationSubmit.mock.calls[0][0];
    expect(submittedPayload.chain_attestation).toBe("unsure");
    expect(submittedPayload.estimated_location_count).toBe("unsure");
    expect(submittedPayload.eligibility_confirmed).toBe(true);
  });

  it("clears the add-mode draft after successful submit", async () => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        values: { shopName: "Draft Deli" },
        selectedCategories: [],
        updatedAt: Date.now(),
      }),
    );

    renderShopForm();
    await fillRequiredAddFields();
    fireEvent.click(
      screen.getByRole("button", { name: /yes, it is local\/independent/i }),
    );

    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => {
      expect(mockState.handleLocationSubmit).toHaveBeenCalled();
      expect(localStorage.getItem(draftKey)).toBeNull();
    });
  });

  it("does not restore add-mode drafts in edit mode", () => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        values: { shopName: "Draft Deli" },
        selectedCategories: [],
        updatedAt: Date.now(),
      }),
    );

    renderShopForm("edit");

    expect(
      screen.queryByText(/restored your unsent shop draft/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Draft Deli")).not.toBeInTheDocument();
  });
});
