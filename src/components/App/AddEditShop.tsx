import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { HiChevronUp, HiChevronDown } from "react-icons/hi";
import ShopForm from "../Form/ShopForm";
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
  zip?: string;
  zip_code?: string;
  postal_code?: string;
  postalCode?: string;
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

    const postcode =
      (rawInitialData.postcode as string | undefined) ||
      rawInitialData.postalCode ||
      rawInitialData.zip ||
      rawInitialData.zip_code ||
      rawInitialData.postal_code ||
      "";

    const locationStatus = isLocationStatus(rawInitialData.locationStatus)
      ? rawInitialData.locationStatus
      : undefined;

    return {
      ...rawInitialData,
      website_url,
      phone,
      postcode,
      locationStatus,
    };
  }, [rawInitialData]);

  const { removeShopFromContext } = useShops();
  const { addToast } = useToast();
  const { userMetadata } = useAuth();

  const [isMapCollapsed, setIsMapCollapsed] = useState(false);

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

    try {
      await deleteShop(initialData.shopId, userMetadata.id, userMetadata.role);
      removeShopFromContext(initialData.shopId);
      addToast("Shop deleted successfully", "success");
      navigate("/");
    } catch (error) {
      console.error("Failed to delete shop:", error);
      addToast("Failed to delete shop. Please try again.", "error");
    }
  };

  return (
    <div className="fixed inset-0 pt-[50px] md:pt-10 bg-surface-light dark:bg-surface-dark">
      <div className="flex flex-col md:flex-row h-[calc(100vh-3.5rem)] md:h-[calc(100vh-2.5rem)]">
        <div
          className={`w-full md:w-1/2 bg-white dark:bg-surface-darker border-r border-gray-200 dark:border-gray-700 flex flex-col order-1 md:order-1 overflow-hidden transition-all duration-300 ${
            isMapCollapsed ? "h-[calc(100%-3rem)]" : "h-[60vh]"
          } md:h-full`}
        >
          <ShopForm
            initialData={initialData}
            mode={initialData ? "edit" : "add"}
            layoutMode="form-section"
            onDelete={handleDeleteShop}
            onNavigateToMap={() => navigate("/")}
          />
        </div>

        <div
          className={`w-full md:w-1/2 relative order-2 md:order-2 transition-all duration-300 ${
            isMapCollapsed ? "h-12" : "h-[40vh]"
          } md:h-full`}
        >
          {/* Mobile Collapse Notch */}
          <button
            onClick={() => setIsMapCollapsed(!isMapCollapsed)}
            className="md:hidden absolute top-0 left-0 right-0 z-10 bg-white dark:bg-surface-darker border-b border-gray-200 dark:border-gray-700 h-12 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex flex-col items-center gap-1">
              {isMapCollapsed ? (
                <>
                  <HiChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Show Map
                  </span>
                </>
              ) : (
                <>
                  <HiChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Hide Map
                  </span>
                </>
              )}
            </div>
          </button>

          {/* Map Content */}
          <div
            className={`h-full ${isMapCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"} transition-opacity duration-300 md:opacity-100 md:pointer-events-auto`}
          >
            <ShopForm
              initialData={initialData}
              mode={initialData ? "edit" : "add"}
              layoutMode="map-section"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEditShop;
