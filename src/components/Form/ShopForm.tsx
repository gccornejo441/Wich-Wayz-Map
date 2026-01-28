import Select, { GroupBase, MultiValue, StylesConfig } from "react-select";
import { InputMask } from "@react-input/mask";
import { useEffect, useMemo, useState } from "react";

import { useAddShopForm } from "@/hooks/useAddShopForm";
import { useTheme } from "@hooks/useTheme";
import InputField from "../Utilites/InputField";
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
  address: AddressDraft;
  onAddressChange: (next: AddressDraft) => void;
  onPrefillSuccess?: () => void;
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
  }),
  singleValue: (base) => ({
    ...base,
    color: isDark ? "#FFFFFF" : "#4b5563",
  }),
  input: (base) => ({
    ...base,
    color: isDark ? "#FFFFFF" : "#4b5563",
    borderColor: isDark ? "#4b5563" : base.borderColor,
  }),
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
  address,
  onAddressChange,
  onPrefillSuccess,
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
  } = useAddShopForm(initialData, mode, address);

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
          initialData.locationId,
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
    Boolean(address.streetAddress.trim()) &&
    !isSubmitting &&
    addressLookupState !== "loading";

  // Handler to select an address from suggestions
  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setLookupMessage(suggestion.formattedAddress);
    setAddressLookupState("success");
    setAddressSuggestions([]);

    // Apply the selected address to form fields
    applyParsedAddressToForm(suggestion.parsedData);
    onPrefillSuccess?.();
  };

  // Handler to confirm and lock the address
  const handleConfirmAddress = () => {
    setAddressLocked(true);
    // Keep lookupMessage and success state
  };

  // Handler to dismiss search result and reset
  const handleDismissSearch = () => {
    setAddressLookupState("idle");
    setLookupMessage("");
    setAddressSuggestions([]);
    // Fields remain unlocked
  };

  // Handler to unlock fields for editing
  const handleEditAddress = () => {
    setAddressLocked(false);
    setAddressLookupState("idle");
    setLookupMessage("");
    setAddressSuggestions([]);
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="p-4 space-y-4 overflow-y-auto"
    >
      <InputField
        name="shopName"
        label="Shop Name"
        register={register}
        errors={errors}
        placeholder="Enter shop name"
      />

      <InputField
        name="shop_description"
        label="Shop Description"
        register={register}
        errors={errors}
        placeholder="Enter shop description"
      />

      <div>
        <label className="block mb-2 text-sm font-medium text-text-base dark:text-text-inverted">
          Website URL
        </label>
        <input
          type="text"
          placeholder="https://example.com"
          {...register("website_url", {
            setValueAs: (v) => normalizeWebsiteUrl(String(v ?? "")),
          })}
          className={`w-full text-dark dark:text-white text-md border-2 px-4 py-2 bg-white dark:bg-surface-dark focus:border-1 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out rounded-md ${errors.website_url
            ? "border-red-500 dark:border-red-500"
            : "border-brand-primary dark:border-text-muted"
            }`}
        />
        {errors.website_url && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">
            {errors.website_url.message}
          </p>
        )}
      </div>

      <InputField name="phone" label="Phone" errors={errors}>
        <InputMask
          mask="(___) ___-____"
          replacement={{ _: /\d/ }}
          placeholder="(123) 456-7890"
          {...register("phone")}
          className={`w-full text-dark dark:text-white text-md border-2 border-brand-primary dark:border-text-muted px-4 py-2 bg-white dark:bg-surface-dark focus:border-1 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out rounded-md ${errors.phone ? "border-red-500 dark:border-red-500" : ""
            }`}
        />
      </InputField>

      <div>
        <label className="block mb-2 text-sm font-medium text-text-base dark:text-text-inverted">
          Select Categories
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select<CategoryOption, true, GroupBase<CategoryOption>>
              placeholder="Search"
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
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="h-[45px] px-4 rounded-md bg-brand-primary text-white hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50 transition-colors duration-200 ease-in-out flex items-center gap-2 whitespace-nowrap"
          >
            Add Category
          </button>
        </div>
      </div>

      {isEditMode && canEditStatus && (
        <div>
          <label className="block mb-2 text-sm font-medium text-text-base dark:text-text-inverted">
            Location Status
          </label>
          <select
            value={locationStatus}
            onChange={(e) =>
              setLocationStatus(e.target.value as LocationStatus)
            }
            className="w-full text-dark dark:text-white text-md border-2 px-4 py-2 bg-white dark:bg-surface-dark focus:border-1 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out rounded-md border-brand-primary dark:border-text-muted"
          >
            <option value="open">Open</option>
            <option value="temporarily_closed">Temporarily Closed</option>
            <option value="permanently_closed">Permanently Closed</option>
          </select>
          <p className="mt-1 text-xs text-text-muted dark:text-text-inverted">
            Update the current operational status of this location
          </p>
        </div>
      )}

      <div className="space-y-4">
        <InputField
          name="address"
          label="Street Address"
          register={register}
          errors={errors}
          value={address.streetAddress}
          placeholder="Enter street address"
          readOnly={addressLocked}
          onChange={(e) => {
            onAddressChange({ ...address, streetAddress: e.target.value });
            if (addressLookupState !== "idle") {
              setAddressLookupState("idle");
              setAddressLocked(false);
              setLookupMessage("");
            }
          }}
        />

        <InputField
          name="address_second"
          label="Street Address Line 2 (Optional)"
          register={register}
          errors={errors}
          value={address.streetAddressSecond}
          placeholder="Apt, Suite, Unit, etc."
          onChange={(e) =>
            onAddressChange({ ...address, streetAddressSecond: e.target.value })
          }
        />

        <InputField
          name="city"
          label="City"
          register={register}
          errors={errors}
          value={address.city}
          placeholder="Enter city"
          readOnly={addressLocked}
          onChange={(e) =>
            onAddressChange({ ...address, city: e.target.value })
          }
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-text-base dark:text-text-inverted">
              State
            </label>
            <select
              {...register("state")}
              value={address.state}
              disabled={addressLocked}
              onChange={(e) =>
                onAddressChange({ ...address, state: e.target.value })
              }
              className={`w-full text-dark dark:text-white text-md border-2 px-4 py-2 bg-white dark:bg-surface-dark focus:border-1 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out rounded-md ${errors.state
                ? "border-red-500 dark:border-red-500"
                : "border-brand-primary dark:border-text-muted"
                } ${addressLocked ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <option value="" className="text-gray-400 dark:text-gray-500">
                Select a state...
              </option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                {errors.state.message}
              </p>
            )}
          </div>

          <InputField
            name="postcode"
            label="Postal Code"
            register={register}
            errors={errors}
            value={address.postalCode}
            placeholder="Enter postal code"
            readOnly={addressLocked}
            onChange={(e) =>
              onAddressChange({ ...address, postalCode: e.target.value })
            }
          />
        </div>

        <InputField
          name="country"
          label="Country"
          register={register}
          errors={errors}
          value={address.country}
          placeholder="Enter country"
          readOnly={addressLocked}
          onChange={(e) =>
            onAddressChange({ ...address, country: e.target.value })
          }
        />
      </div>

      <button
        type="button"
        onClick={async () => {
          setAddressLookupState("loading");
          setLookupMessage("");
          setAddressSuggestions([]);

          const result = await searchAddressSuggestions();

          if (result.success && result.suggestions) {
            if (result.suggestions.length === 1) {
              // Single result - go directly to confirmation
              const suggestion = result.suggestions[0];
              setLookupMessage(suggestion.formattedAddress);
              setAddressLookupState("success");
              applyParsedAddressToForm(suggestion.parsedData);
              onPrefillSuccess?.();
            } else {
              // Multiple results - show selection list
              setAddressSuggestions(result.suggestions);
              setAddressLookupState("suggestions");
            }
          } else {
            setAddressLookupState("error");
            setLookupMessage(
              "Could not find a match. Check the street address and try again.",
            );
          }
        }}
        disabled={!canSearchAddress}
        className={`w-full px-4 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50 flex items-center justify-center ${!canSearchAddress ? "opacity-50 cursor-not-allowed" : ""
          }`}
        title="Click to search for the address"
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
      {/* Address Suggestions List */}
      {addressLookupState === "suggestions" &&
        addressSuggestions.length > 0 && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-brand-primary bg-surface-muted dark:bg-surface-dark p-3"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white flex-shrink-0">
                <span
                  className="text-[11px] leading-none translate-y-[0.5px]"
                  aria-hidden="true"
                >
                  {addressSuggestions.length}
                </span>
              </div>
              <span className="text-sm font-semibold text-text-base dark:text-text-inverted">
                Found {addressSuggestions.length} address
                {addressSuggestions.length !== 1 ? "es" : ""} - Select one:
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {addressSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-3 py-2.5 rounded-md bg-white dark:bg-surface-darker hover:bg-brand-primary/10 dark:hover:bg-brand-primary/20 border border-gray-200 dark:border-gray-700 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg
                        className="h-4 w-4 text-brand-primary opacity-60 group-hover:opacity-100"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-text-base dark:text-text-inverted flex-1">
                      {suggestion.formattedAddress}
                    </span>
                    <svg
                      className="h-4 w-4 text-brand-primary opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleDismissSearch}
                className="text-brand-primary hover:text-brand-secondary underline text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      {/* Variant A: Pending Confirmation (fields stay unlocked) */}
      {addressLookupState === "success" && !addressLocked && lookupMessage && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-l-4 border-l-brand-primary border-brand-primary bg-surface-muted dark:bg-surface-dark p-3"
        >
          {/* Header with found message */}
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white flex-shrink-0">
              <span
                className="text-[11px] leading-none translate-y-[0.5px]"
                aria-hidden="true"
              >
                ✓
              </span>
            </div>
            <span className="text-sm text-text-base dark:text-text-inverted">
              Found: {lookupMessage}
            </span>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmAddress}
              className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary transition-colors text-sm font-medium"
            >
              Use This Address
            </button>
            <button
              type="button"
              onClick={handleDismissSearch}
              className="px-4 py-2 text-brand-primary hover:text-brand-secondary underline text-sm font-medium"
            >
              Edit Manually
            </button>
          </div>
        </div>
      )}

      {/* Variant B: Confirmed (fields locked) */}
      {addressLookupState === "success" && addressLocked && lookupMessage && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-l-4 border-l-brand-primary border-brand-primary bg-surface-muted dark:bg-surface-dark p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white flex-shrink-0">
              <span
                className="text-[11px] leading-none translate-y-[0.5px]"
                aria-hidden="true"
              >
                ✓
              </span>
            </div>
            <span className="text-sm text-text-base dark:text-text-inverted">
              Address confirmed: {lookupMessage}
            </span>
          </div>
          <button
            type="button"
            onClick={handleEditAddress}
            className="text-brand-primary hover:text-brand-secondary underline text-sm font-medium whitespace-nowrap"
          >
            Edit
          </button>
        </div>
      )}

      {addressLookupState === "error" && lookupMessage && (
        <div className="rounded-lg border border-brand-primary/30 bg-white dark:bg-surface-dark px-4 py-3 flex items-start gap-3 shadow-sm">
          <div className="mt-0.5 h-5 w-5 rounded-full border border-brand-primary/60 text-brand-primary flex items-center justify-center text-xs">
            !
          </div>
          <div className="text-sm text-text-base dark:text-text-inverted">
            {lookupMessage}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={
          !isAddressValid ||
          !!errors.shopName ||
          !!errors.address ||
          isSubmitting
        }
        className={`w-full px-4 py-2 rounded-lg text-white flex items-center justify-center ${!isAddressValid ||
          !!errors.shopName ||
          !!errors.address ||
          isSubmitting
          ? "bg-brand-primary opacity-30 text-gray-500 cursor-not-allowed"
          : "bg-brand-primary hover:bg-secondary"
          }`}
      >
        {isSubmitting ? (
          <>
            <LoadingSpinner />
            {mode === "edit" ? "Updating..." : "Submitting..."}
          </>
        ) : (
          <>{mode === "edit" ? "Update Location" : "Submit Location"}</>
        )}
      </button>

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
};

export default ShopForm;
