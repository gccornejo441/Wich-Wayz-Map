import Select, { GroupBase, MultiValue, StylesConfig } from "react-select";
import { InputMask } from "@react-input/mask";
import { useEffect, useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { HiTrash, HiMap, HiSave } from "react-icons/hi";

import { useAddShopForm } from "@/hooks/useAddShopForm";
import { coerceNumber } from "@/utils/normalizers";
import { useTheme } from "@hooks/useTheme";
import AddCategoryModal from "../Modal/AddCategoryModal";

import { AddAShopPayload, LocationStatus } from "@/types/dataTypes";
import { AddressDraft } from "@/types/address";
import {
  addCategoryIfNotExists,
  GetCategories,
} from "@/services/categoryService";
import { US_STATES } from "@constants/usStates";
import { useAuth } from "@context/authContext";
import { useToast } from "@context/toastContext";
import { updateShopLocationStatus } from "@services/shopService";
import { useShops } from "@context/shopContext";
import { applyLocationStatusToShop } from "@/utils/shops";

type AddressLookupState =
  | "idle"
  | "success"
  | "error"
  | "loading"
  | "suggestions";

interface AddressSuggestion {
  formattedAddress: string;
  parsedData: {
    coordinates: { latitude: number; longitude: number };
    components: {
      house_number?: string;
      street?: string;
      road?: string;
      secondary_address?: string;
      city?: string;
      town?: string;
      state?: string;
      postcode?: string;
      country?: string;
    };
  };
}

type ShopFormProps = {
  initialData?: Partial<AddAShopPayload> & {
    shopId?: number;
    locationId?: number;
    locationStatus?: LocationStatus;
    created_by?: number;
  };
  mode: "add" | "edit";
  layoutMode?: "map-section" | "form-section";
  onDelete?: () => void;
  onNavigateToMap?: () => void;
};

interface CategoryOption {
  value: number;
  label: string;
}

const getCustomSelectStyles = (
  isDark: boolean,
): StylesConfig<CategoryOption, true> => ({
  menuPortal: (base) => ({ ...base, zIndex: 1050 }),
  control: (base, state) => ({
    ...base,
    backgroundColor: isDark ? "#1E1E2F" : "#FFFFFF",
    color: isDark ? "#FFFFFF" : "#000000",
    borderColor: state.isFocused || isDark ? "#9CA3AF" : "#DA291C",
    borderWidth: state.isFocused ? "1px" : "2px",
    boxShadow: state.isFocused ? "0 0 0 1px #4b5563" : base.boxShadow,
    padding: "0.2rem",
    "&:hover": { borderColor: "#4b5563" },
    minHeight: "36px",
  }),
  singleValue: (base) => ({ ...base, color: isDark ? "#FFFFFF" : "#4b5563" }),
  input: (base) => ({ ...base, color: isDark ? "#FFFFFF" : "#4b5563" }),
  menu: (base) => ({
    ...base,
    backgroundColor: isDark ? "#1E1E2F" : "#FFFFFF",
    color: isDark ? "#FFFFFF" : "#4b5563",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? isDark
        ? "#2A2A3C"
        : "#F3F4F6"
      : "transparent",
    color: isDark ? "#FFFFFF" : "#4b5563",
    cursor: "pointer",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: isDark ? "#2A2A3C" : "#E5E7EB",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: isDark ? "#FFFFFF" : "#4b5563",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: isDark ? "#F87171" : "#DC2626",
    ":hover": {
      backgroundColor: isDark ? "#7F1D1D" : "#FECACA",
      color: isDark ? "#FECACA" : "#7F1D1D",
    },
  }),
});

const LoadingSpinner = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const normalizeWebsiteUrl = (raw: string): string => {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (v.startsWith("https://")) return v;
  if (v.startsWith("http://")) return `https://${v.slice("http://".length)}`;
  if (v.includes("://")) return "";
  return `https://${v}`;
};

const ShopForm = ({
  initialData,
  mode,
  layoutMode,
  onDelete,
  onNavigateToMap,
}: ShopFormProps) => {
  const {
    register,
    handleSubmit,
    errors,
    onSubmit,
    searchAddressSuggestions,
    applyParsedAddressToForm,
    isAddressValid,
    categories,
    setCategories,
    selectedCategories,
    setSelectedCategories,
    setValue,
    control,
  } = useAddShopForm(initialData, mode);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { isAuthenticated, userMetadata } = useAuth();
  const { addToast } = useToast();
  const { updateShopInContext, shops } = useShops();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [addressLookupState, setAddressLookupState] =
    useState<AddressLookupState>("idle");
  const [addressLocked, setAddressLocked] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [pendingParsedAddress, setPendingParsedAddress] = useState<
    AddressSuggestion["parsedData"] | null
  >(null);

  const watchedFields = useWatch({
    control,
    name: [
      "address",
      "address_second",
      "city",
      "state",
      "postcode",
      "country",
      "latitude",
      "longitude",
    ],
  });

  const derivedAddress: AddressDraft = {
    streetAddress: (watchedFields[0] as string) ?? "",
    streetAddressSecond: (watchedFields[1] as string) ?? "",
    city: (watchedFields[2] as string) ?? "",
    state: (watchedFields[3] as string) ?? "",
    postalCode: (watchedFields[4] as string) ?? "",
    country: (watchedFields[5] as string) ?? "",
    latitude: coerceNumber(watchedFields[6]),
    longitude: coerceNumber(watchedFields[7]),
  };

  const commitParsedAddress = (parsed: AddressSuggestion["parsedData"]) => {
    applyParsedAddressToForm(parsed);
  };

  useEffect(() => {
    const next = normalizeWebsiteUrl(String(initialData?.website_url ?? ""));
    setValue("website_url", next, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });

    const phone = String(initialData?.phone ?? "");
    setValue("phone", phone, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [initialData?.website_url, initialData?.phone, setValue]);

  const [locationStatus, setLocationStatus] = useState<LocationStatus>(
    (initialData?.locationStatus as LocationStatus) || "open",
  );
  const [initialLocationStatus] = useState<LocationStatus>(
    (initialData?.locationStatus as LocationStatus) || "open",
  );

  const canEditStatus = useMemo(() => {
    if (!isAuthenticated || !userMetadata) return false;
    if (userMetadata.role === "admin") return true;
    const createdBy = initialData?.created_by;
    if (typeof createdBy === "number") return createdBy === userMetadata.id;
    return false;
  }, [isAuthenticated, userMetadata, initialData]);

  const isEditMode = mode === "edit";

  const categoryOptions: CategoryOption[] = categories.map((cat) => ({
    value: cat.id!,
    label: cat.category_name,
  }));

  const selectedOptions: CategoryOption[] = categoryOptions.filter((opt) =>
    selectedCategories.includes(opt.value),
  );

  const handleFormSubmit = async (data: AddAShopPayload) => {
    setIsSubmitting(true);
    try {
      data.website_url = normalizeWebsiteUrl(String(data.website_url ?? ""));
      await onSubmit(data);

      if (
        isEditMode &&
        locationStatus !== initialLocationStatus &&
        initialData?.shopId
      ) {
        if (!userMetadata?.id || !userMetadata?.role) {
          addToast("Authentication required to update status", "error");
          return;
        }

        const result = await updateShopLocationStatus(
          initialData.shopId,
          locationStatus,
          initialData.locationId ?? undefined,
          userMetadata.id,
          userMetadata.role,
        );

        const existingShop = shops.find((s) => s.id === initialData.shopId);
        if (existingShop) {
          const updatedShop = applyLocationStatusToShop(
            existingShop,
            result.locationId,
            result.locationStatus,
          );
          updateShopInContext(updatedShop);
        }
        addToast("Shop status updated successfully", "success");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshCategories = async () => {
    const updatedCategories = await GetCategories();
    setCategories(updatedCategories);
  };

  const canSearchAddress =
    Boolean(derivedAddress.streetAddress.trim()) &&
    !isSubmitting &&
    addressLookupState !== "loading";

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setLookupMessage(suggestion.formattedAddress);
    setAddressLookupState("success");
    setAddressSuggestions([]);
    setPendingParsedAddress(suggestion.parsedData);
  };

  const handleConfirmAddress = () => {
    if (pendingParsedAddress) commitParsedAddress(pendingParsedAddress);
    setAddressLocked(true);
  };

  const handleDismissSearch = () => {
    setAddressLookupState("idle");
    setLookupMessage("");
    setAddressSuggestions([]);
    setPendingParsedAddress(null);
  };

  const handleEditAddress = () => {
    setAddressLocked(false);
    setAddressLookupState("idle");
    setLookupMessage("");
    setAddressSuggestions([]);
    setPendingParsedAddress(null);
  };

  const canSubmit = isAddressValid && !errors.shopName && !errors.address;

  if (layoutMode === "form-section") {
    const isAdmin = userMetadata?.role === "admin";

    return (
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col border-t-[1px] border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-darker">
          <h4 className="text-sm font-semibold text-text-base dark:text-text-inverted">
            {isEditMode
              ? `Edit ${initialData?.shopName || "Shop"}`
              : "Add New Shop"}
          </h4>
          <div className="flex gap-2">
            {isEditMode && isAdmin && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 flex items-center gap-1.5 transition text-xs"
                title="Delete this shop (Admin only)"
              >
                <HiTrash className="w-4 h-4" />
                <span className="sm:inline hidden">Delete</span>
              </button>
            ) : null}
            {onNavigateToMap ? (
              <button
                type="button"
                onClick={onNavigateToMap}
                className="bg-gray-500 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 flex items-center gap-1.5 transition text-xs"
              >
                <HiMap className="w-4 h-4" />
                <span className="sm:inline hidden">To Map</span>
              </button>
            ) : null}
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                !canSubmit || isSubmitting
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                  : "bg-brand-primary hover:bg-brand-secondary hover:text-gray-900 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <HiSave className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-text-base dark:text-text-inverted mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              Basics
            </h4>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="shopName"
                  className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                >
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="shopName"
                  type="text"
                  placeholder="Enter shop name"
                  {...register("shopName")}
                  className={`w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors ${
                    errors.shopName
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.shopName && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.shopName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="shop_description"
                  className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                >
                  Description
                </label>
                <textarea
                  id="shop_description"
                  rows={3}
                  placeholder="Describe your shop..."
                  {...register("shop_description")}
                  className="w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors resize-none border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-text-base dark:text-text-inverted">
                Categories
              </h4>
              {selectedCategories.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-brand-primary text-white rounded">
                  {selectedCategories.length}
                </span>
              )}
            </div>
            <div className="space-y-3">
              <Select<CategoryOption, true, GroupBase<CategoryOption>>
                placeholder="Select categories..."
                isMulti
                value={selectedOptions}
                options={categoryOptions}
                onChange={(selected: MultiValue<CategoryOption>) => {
                  setSelectedCategories(selected.map((opt) => opt.value));
                }}
                styles={getCustomSelectStyles(isDark)}
                menuPortalTarget={
                  typeof window !== "undefined" ? document.body : null
                }
                menuPosition="fixed"
                menuPlacement="auto"
                isClearable
                isSearchable
              />
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="text-xs text-brand-primary hover:text-brand-secondary underline"
              >
                + Add New Category
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-base dark:text-text-inverted mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              Contact
            </h4>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="website_url"
                  className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                >
                  Website
                </label>
                <input
                  id="website_url"
                  type="text"
                  placeholder="https://example.com"
                  {...register("website_url", {
                    setValueAs: (v) => normalizeWebsiteUrl(String(v ?? "")),
                  })}
                  className="w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors border-gray-300 dark:border-gray-600"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                >
                  Phone
                </label>
                <InputMask
                  id="phone"
                  mask="(___) ___-____"
                  replacement={{ _: /\d/ }}
                  placeholder="(123) 456-7890"
                  {...register("phone")}
                  className="w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors border-gray-300 dark:border-gray-600"
                />
              </div>

              {isEditMode && canEditStatus && (
                <div>
                  <label
                    htmlFor="locationStatus"
                    className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                  >
                    Status
                  </label>
                  <select
                    id="locationStatus"
                    value={locationStatus}
                    onChange={(e) =>
                      setLocationStatus(e.target.value as LocationStatus)
                    }
                    className="w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors border-gray-300 dark:border-gray-600"
                  >
                    <option value="open">Open</option>
                    <option value="temporarily_closed">
                      Temporarily Closed
                    </option>
                    <option value="permanently_closed">
                      Permanently Closed
                    </option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-base dark:text-text-inverted mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              Address
            </h4>
            <div className="space-y-3">
              {addressLocked && lookupMessage ? (
                <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-l-brand-primary rounded p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-base dark:text-text-inverted mb-1">
                        Confirmed
                      </p>
                      <p className="text-xs text-text-muted dark:text-text-inverted break-words">
                        {lookupMessage}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleEditAddress}
                      className="text-xs text-brand-primary hover:text-brand-secondary underline flex-shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="address"
                      className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                    >
                      Street
                    </label>
                    <input
                      id="address"
                      type="text"
                      placeholder="123 Main St"
                      {...register("address")}
                      readOnly={addressLocked}
                      className="w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors border-gray-300 dark:border-gray-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="address_second"
                      className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                    >
                      Line 2
                    </label>
                    <input
                      id="address_second"
                      type="text"
                      placeholder="Apt, Suite"
                      {...register("address_second")}
                      className="w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors border-gray-300 dark:border-gray-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="city"
                      className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                    >
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      placeholder="City"
                      {...register("city")}
                      readOnly={addressLocked}
                      className="w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors border-gray-300 dark:border-gray-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="state"
                        className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                      >
                        State
                      </label>
                      <select
                        id="state"
                        {...register("state")}
                        className="w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors border-gray-300 dark:border-gray-600"
                      >
                        <option value="">Select...</option>
                        {US_STATES.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="postcode"
                        className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                      >
                        ZIP
                      </label>
                      <input
                        id="postcode"
                        type="text"
                        placeholder="12345"
                        {...register("postcode")}
                        readOnly={addressLocked}
                        className="w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setAddressLookupState("loading");
                      const result = await searchAddressSuggestions();
                      if (result.success && result.suggestions) {
                        if (result.suggestions.length === 1) {
                          const suggestion = result.suggestions[0];
                          setLookupMessage(suggestion.formattedAddress);
                          setAddressLookupState("success");
                          setPendingParsedAddress(suggestion.parsedData);
                        } else {
                          setAddressSuggestions(result.suggestions);
                          setAddressLookupState("suggestions");
                        }
                      } else {
                        setAddressLookupState("error");
                        setLookupMessage(
                          "No match found. Check address and try again.",
                        );
                      }
                    }}
                    disabled={!canSearchAddress}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                      !canSearchAddress
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-brand-primary text-white hover:bg-brand-secondary hover:text-gray-900"
                    }`}
                  >
                    {addressLookupState === "loading" ? (
                      <>
                        <LoadingSpinner />
                        Searching...
                      </>
                    ) : (
                      "Search Address"
                    )}
                  </button>

                  {addressLookupState === "suggestions" &&
                    addressSuggestions.length > 0 && (
                      <div className="bg-surface-muted dark:bg-surface-darker border border-gray-300 dark:border-gray-600 rounded p-2 space-y-1">
                        <p className="text-xs font-medium mb-1 text-text-base dark:text-text-inverted">
                          Found {addressSuggestions.length} - Select one:
                        </p>
                        {addressSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="w-full text-left px-2 py-1.5 rounded bg-white dark:bg-surface-dark hover:bg-brand-primary/10 dark:hover:bg-brand-primary/20 text-xs text-text-base dark:text-text-inverted transition-colors"
                          >
                            {suggestion.formattedAddress}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleDismissSearch}
                          className="text-xs text-brand-primary hover:text-brand-secondary underline transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                  {addressLookupState === "success" &&
                    !addressLocked &&
                    lookupMessage && (
                      <div className="bg-surface-muted dark:bg-surface-darker border-l-4 border-l-brand-primary rounded p-2">
                        <p className="text-xs mb-2 text-text-base dark:text-text-inverted">
                          Found: {lookupMessage}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleConfirmAddress}
                            className="px-3 py-1.5 bg-brand-primary text-white rounded text-xs hover:bg-brand-secondary hover:text-text-base transition-colors"
                          >
                            Use This Address
                          </button>
                          <button
                            type="button"
                            onClick={handleDismissSearch}
                            className="text-xs text-brand-primary hover:text-brand-secondary underline transition-colors"
                          >
                            Edit Manually
                          </button>
                        </div>
                      </div>
                    )}

                  {addressLookupState === "error" && lookupMessage && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                      <p className="text-xs text-red-700 dark:text-red-300">
                        {lookupMessage}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <AddCategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSubmit={async (name, desc) => {
            try {
              await addCategoryIfNotExists(name, desc);
              await refreshCategories();

              const updated = await GetCategories();
              const newCategory = updated.find(
                (cat) => cat.category_name === name,
              );
              const newCategoryId = newCategory?.id;

              if (typeof newCategoryId === "number") {
                setSelectedCategories((prev) => [...prev, newCategoryId]);
              }

              setShowCategoryModal(false);
            } catch (err) {
              if (err instanceof Error) alert(err.message);
              else console.error("Unexpected error:", err);
            }
          }}
        />
      </form>
    );
  }

  return null;
};

export default ShopForm;
