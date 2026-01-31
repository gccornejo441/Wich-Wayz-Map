import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { HiMap, HiX, HiCheck, HiTrash } from "react-icons/hi";
import ShopForm from "../Form/ShopForm";
import MapPreview from "../Map/MapPreview";
import { AddressDraft, emptyAddress } from "@/types/address";
import { buildFullAddressForMaps } from "@/utils/address";
import { deleteShop } from "@services/shopService";
import { useShops } from "@context/shopContext";
import { useToast } from "@context/toastContext";
import { useAuth } from "@context/authContext";
import { AddAShopPayload, LocationStatus } from "@/types/dataTypes";

type ShopFormInitialData = Partial<AddAShopPayload> & {
  shopId?: number;
  locationId?: number;
  locationStatus?: LocationStatus;
  created_by?: number;
  websiteUrl?: string;
  website?: string;
  phone_number?: string;
  phoneNumber?: string;
};

const isLocationStatus = (v: unknown): v is LocationStatus =>
  v === "open" || v === "temporarily_closed" || v === "permanently_closed";

const AddEditShop = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const rawInitialData = location.state?.initialData as
    | ShopFormInitialData
    | undefined;

  const initialData = useMemo<ShopFormInitialData | undefined>(() => {
    if (!rawInitialData) return undefined;

    const website_url =
      (rawInitialData.website_url as string | undefined) ??
      rawInitialData.websiteUrl ??
      rawInitialData.website ??
      "";

    const phone =
      (rawInitialData.phone as string | undefined) ??
      rawInitialData.phone_number ??
      rawInitialData.phoneNumber ??
      "";

    const locationStatus = isLocationStatus(rawInitialData.locationStatus)
      ? rawInitialData.locationStatus
      : undefined;

    return {
      ...rawInitialData,
      website_url,
      phone,
      locationStatus,
    };
  }, [rawInitialData]);

  const { removeShopFromContext } = useShops();
  const { addToast } = useToast();
  const { userMetadata } = useAuth();

  const isAdmin = userMetadata?.role === "admin";

  const fromInitialData = (
    data: ShopFormInitialData | undefined,
  ): AddressDraft => {
    if (!data) return emptyAddress;

    const getStringAny = (...keys: string[]): string => {
      const obj = data as unknown as Record<string, unknown>;
      for (const k of keys) {
        const v = obj[k];
        if (typeof v === "string") return v;
        if (typeof v === "number") return String(v);
      }
      return "";
    };

    const getNumberAny = (...keys: string[]): number | null => {
      const obj = data as unknown as Record<string, unknown>;
      for (const k of keys) {
        const v = obj[k];
        if (typeof v === "number") return v;
      }
      return null;
    };

    return {
      streetAddress: getStringAny("address_first", "address", "streetAddress"),
      streetAddressSecond: getStringAny(
        "address_second",
        "streetAddressSecond",
      ),
      city: getStringAny("city"),
      state: getStringAny("state"),
      postalCode: getStringAny("postcode", "postalCode", "zip", "zipCode", "zipcode", "postal_code"),
      country: getStringAny("country") || "USA",
      latitude: getNumberAny("latitude"),
      longitude: getNumberAny("longitude"),
    };
  };

  const [address, setAddress] = useState<AddressDraft>(() =>
    fromInitialData(initialData),
  );

  useEffect(() => {
    setAddress(fromInitialData(initialData));
  }, [initialData]);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [prefillFlyToNonce, setPrefillFlyToNonce] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteShop = async () => {
    if (!initialData?.shopId) {
      addToast("Cannot delete shop: No shop ID found", "error");
      return;
    }

    if (!userMetadata?.id || !userMetadata?.role) {
      addToast("User authentication required", "error");
      return;
    }

    if (userMetadata.role !== "admin") {
      addToast("Admin access required to delete shops", "error");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${initialData.shopName}"? This action cannot be undone.`,
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await deleteShop(initialData.shopId, userMetadata.id, userMetadata.role);
      removeShopFromContext(initialData.shopId);
      addToast("Shop deleted successfully", "success");
      navigate("/");
    } catch (error) {
      console.error("Failed to delete shop:", error);
      addToast("Failed to delete shop. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const fullAddressForMaps = useMemo(
    () =>
      buildFullAddressForMaps(
        address.streetAddress,
        address.streetAddressSecond,
        address.city,
        address.state,
        address.postalCode,
      ),
    [
      address.streetAddress,
      address.streetAddressSecond,
      address.city,
      address.state,
      address.postalCode,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMapModalOpen(false);
    };

    if (isMapModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMapModalOpen]);

  return (
    <div className="min-h-[100dvh] pt-16 md:pt-10 flex items-center justify-center dark:bg-surface-dark px-4">
      <div className="w-full max-w-6xl bg-white dark:bg-surface-darker p-6 rounded-xl shadow-md space-y-6">
        <div className="flex items-center justify-between border-b border-secondary pb-4">
          <h2 className="text-2xl font-bold text-text-base dark:text-text-inverted">
            {initialData ? `Edit ${initialData?.shopName}` : "Add New Shop"}
          </h2>
          <div className="flex gap-2">
            {initialData && isAdmin && (
              <button
                onClick={handleDeleteShop}
                disabled={isDeleting}
                className="cursor-pointer bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex gap-2 transition duration-300"
                title="Delete this shop (Admin only)"
              >
                <HiTrash className="w-5 h-5" />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
            <button
              onClick={() => navigate("/")}
              className="dark:bg-brand-primary cursor-pointer bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-primaryBorder flex gap-2 transition duration-300"
            >
              <HiMap className="w-5 h-5" /> To Map
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 items-stretch min-h-[400px]">
          <div className="w-full lg:max-w-md">
            <ShopForm
              initialData={initialData}
              address={address}
              onAddressChange={setAddress}
              mode={initialData ? "edit" : "add"}
              onPrefillSuccess={() => setPrefillFlyToNonce((n) => n + 1)}
            />

            <div className="lg:hidden mt-4">
              <button
                onClick={() => setIsMapModalOpen(true)}
                className="w-full bg-brand-primary text-white hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <HiMap className="w-5 h-5" />
                Show Map
              </button>
            </div>
          </div>

          <div className="hidden lg:flex flex-grow pl-6 pt-6 border-l border-lightGray dark:border-surface-light flex-col">
            <MapPreview
              address={address}
              fullAddressForMaps={fullAddressForMaps}
              onAddressUpdate={setAddress}
              prefillFlyToNonce={prefillFlyToNonce}
            />
          </div>
        </div>
      </div>

      {isMapModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center px-4 transition-opacity duration-300 animate-fadeIn"
          onClick={() => setIsMapModalOpen(false)}
          aria-modal="true"
          role="dialog"
          aria-labelledby="map-modal-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-surface-dark border border-lightGray dark:border-surface-light rounded-2xl overflow-hidden shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col animate-slideUp relative"
            tabIndex={-1}
            ref={(el) => el?.focus()}
          >
            <button
              onClick={() => setIsMapModalOpen(false)}
              aria-label="Close Map Modal"
              className="absolute top-3 left-3 z-[100] text-text-base dark:text-text-inverted bg-white/90 dark:bg-surface-dark/90 rounded-full p-1 shadow-md hover:scale-105 transition"
            >
              <HiX className="w-5 h-5" />
            </button>

            <h2 id="map-modal-title" className="sr-only">
              Map Selection Modal
            </h2>

            <div className="flex-1">
              <MapPreview
                address={address}
                fullAddressForMaps={fullAddressForMaps}
                onAddressUpdate={setAddress}
                prefillFlyToNonce={prefillFlyToNonce}
              />
            </div>

            <div className="sticky bottom-0 z-10 bg-surface-muted dark:bg-surface-dark px-4 py-3 border-t border-text-muted dark:border-surface-light">
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="w-full bg-brand-primary hover:bg-brand-primaryHover text-white py-3 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <HiCheck className="w-5 h-5" />
                Use This Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddEditShop;
