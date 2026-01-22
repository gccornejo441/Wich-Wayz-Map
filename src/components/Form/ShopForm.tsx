import Select, { MultiValue, StylesConfig, GroupBase } from "react-select";

import { useAddShopForm } from "@/hooks/useAddShopForm";
import InputField from "../Utilites/InputField";
import ManualAddressFields from "../Utilites/ManualAddressFields";
import { AddAShopPayload } from "@/types/dataTypes";
import { InputMask } from "@react-input/mask";
import { useEffect, useState } from "react";
import AddCategoryModal from "../Modal/AddCategoryModal";
import {
  addCategoryIfNotExists,
  GetCategories,
} from "@/services/categoryService";

type ShopFormProps = {
  initialData?: Partial<AddAShopPayload>;
  mode: "add" | "edit";
  address: string;
  onAddressChange: (value: string) => void;
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
    "&:hover": {
      borderColor: "#4b5563",
    },
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

// Loading Spinner Component
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
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const ShopForm = ({
  initialData,
  mode,
  address,
  onAddressChange,
}: ShopFormProps) => {
  const {
    register,
    handleSubmit,
    errors,
    isManualEntry,
    onSubmit,
    handledManualEntry,
    prefillAddressFields,
    isAddressValid,
    categories,
    setCategories,
    selectedCategories,
    setSelectedCategories,
  } = useAddShopForm(initialData, mode);

  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(
    initialData?.website_url || "https://",
  );

  // Effect to observe changes in the document's class list for dark mode
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Convert categories to options for react-select
  const categoryOptions: CategoryOption[] = categories.map((cat) => ({
    value: cat.id!,
    label: cat.category_name,
  }));

  // Filter selected options based on selectedCategories
  const selectedOptions: CategoryOption[] = categoryOptions.filter((opt) =>
    selectedCategories.includes(opt.value),
  );

  // Wrapper for onSubmit to handle loading state
  const handleFormSubmit = async (data: AddAShopPayload) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
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

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="p-4 space-y-4 overflow-y-auto"
    >
      {/* Shop Name */}
      <InputField
        name="shopName"
        label="Shop Name"
        register={register}
        errors={errors}
        placeholder="Enter shop name"
      />

      {/* Shop Description */}
      <InputField
        name="shop_description"
        label="Shop Description"
        register={register}
        errors={errors}
        placeholder="Enter shop description"
      />

      {/* Website URL with HTTPS enforcement */}
      <div>
        <label className="block mb-2 text-sm font-medium text-text-base dark:text-text-inverted">
          Website URL
        </label>
        <input
          type="text"
          value={websiteUrl}
          {...register("website_url")}
          onChange={(e) => {
            let value = e.target.value;
            // Ensure it always starts with https://
            if (!value.startsWith("https://")) {
              value = "https://";
            }
            setWebsiteUrl(value);
          }}
          onKeyDown={(e) => {
            // Prevent backspace/delete if cursor is within the https:// prefix
            const input = e.currentTarget;
            const cursorPos = input.selectionStart || 0;
            if (
              cursorPos <= 8 &&
              (e.key === "Backspace" || e.key === "Delete")
            ) {
              e.preventDefault();
            }
          }}
          onSelect={(e) => {
            // Prevent selection of the https:// prefix
            const input = e.currentTarget;
            const start = input.selectionStart || 0;
            if (start < 8) {
              input.setSelectionRange(8, input.selectionEnd || 8);
            }
          }}
          placeholder="https://example.com"
          className={`w-full text-dark dark:text-white text-md border-2 px-4 py-2 bg-white dark:bg-surface-dark focus:border-1 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out rounded-md ${
            errors.website_url
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

      {/* Phone Input */}
      <InputField name="phone" label="Phone" errors={errors}>
        <InputMask
          mask="(___) ___-____"
          replacement={{ _: /\d/ }}
          placeholder="(123) 456-7890"
          {...register("phone")}
          className={`w-full text-dark dark:text-white text-md border-2 border-brand-primary dark:border-text-muted px-4 py-2 bg-white dark:bg-surface-dark focus:border-1 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out rounded-md ${
            errors.phone ? "border-red-500 dark:border-red-500" : ""
          }`}
        />
      </InputField>

      {/* Categories */}
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

      {/* Address */}
      <InputField
        name="address"
        label="Address"
        register={register}
        errors={errors}
        value={address}
        placeholder="Enter address"
        onChange={(e) => onAddressChange(e.target.value)}
      />

      {/* Buttons */}
      <div className="flex space-x-4">
        <button
          type="button"
          onClick={prefillAddressFields}
          disabled={isSubmitting}
          className={`w-full px-4 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50 ${
            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title="Click to prefill the address details"
        >
          Prefill Address
        </button>

        <button
          type="button"
          onClick={handledManualEntry}
          disabled={isSubmitting}
          className={`w-full px-4 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50 ${
            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isManualEntry ? "Hide Manual Entry" : "Manually Enter Data"}
        </button>
      </div>

      {/* Manual Fields */}
      {isManualEntry && (
        <ManualAddressFields register={register} errors={errors} />
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={
          !isAddressValid ||
          !!errors.shopName ||
          !!errors.address ||
          isSubmitting
        }
        className={`w-full px-4 py-2 rounded-lg text-white flex items-center justify-center ${
          !isAddressValid ||
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
            if (err instanceof Error) {
              alert(err.message);
            } else {
              console.error("Unexpected error:", err);
            }
          }
        }}
      />
    </form>
  );
};

export default ShopForm;
