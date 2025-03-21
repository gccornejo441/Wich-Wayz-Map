import Select from "react-select";
import { Category } from "@/services/categoryService";
import { useAddShopForm } from "@/hooks/useAddShopForm";
import InputField from "../Utilites/InputField";
import ManualAddressFields from "../Utilites/ManualAddressFields";

const AddShopForm = () => {
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isManualEntry,
    handledManualEntry,
    prefillAddressFields,
    isAddressValid,
    categories,
    selectedCategories,
    setSelectedCategories,
  } = useAddShopForm();

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-4 space-y-4 max-h-[75vh] overflow-y-auto"
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

      {/* Website URL */}
      <InputField
        name="website_url"
        label="Website URL"
        register={register}
        errors={errors}
        placeholder="Enter shop website URL"
      />

<InputField
        name="phone"
        label="Phone"
        register={register}
        errors={errors}
        placeholder="Enter phone number"
      />

      {/* Categories */}
      <div>
        <label className="block mb-2 text-sm font-medium text-dark">
          Select Categories
        </label>
        <Select
          placeholder="Search"
          isMulti
          value={categories
            .filter((cat: Category) => selectedCategories.includes(cat.id!))
            .map((cat: Category) => ({
              value: cat.id,
              label: cat.category_name,
            }))}
          options={categories.map((category: Category) => ({
            value: category.id,
            label: category.category_name,
          }))}
          onChange={(selectedOptions) => {
            const ids = selectedOptions
              ? selectedOptions.map((option) => option.value as number)
              : [];
            setSelectedCategories(ids);
          }}
          menuPortalTarget={document.body}
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 1050 }),
            control: (base, state) => ({
              ...base,
              boxShadow: state.isFocused ? "none" : base.boxShadow,
              borderColor: state.isFocused ? "gray" : base.borderColor,
            }),
          }}
          isClearable
          isSearchable
          className="react-select-container"
          classNamePrefix="react-select"
        />
      </div>

      {/* Address */}
      <InputField
        name="address"
        label="Address"
        register={register}
        errors={errors}
        placeholder="Enter address"
      />

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={prefillAddressFields}
          className="w-full px-4 py-2 rounded-lg bg-primary text-white hover:bg-secondary"
          title="Click to prefill the address details"
        >
          Prefill Address
        </button>

        <button
          type="button"
          onClick={handledManualEntry}
          className="w-full px-4 py-2 text-primary bg-white border border-primary rounded-lg hover:bg-gray-100"
        >
          {isManualEntry ? "Hide Manual Entry" : "Manually Enter Data"}
        </button>
      </div>

      {isManualEntry && (
        <ManualAddressFields register={register} errors={errors} />
      )}

      <button
        type="submit"
        className={`w-full px-4 py-2 rounded-lg text-white ${!isAddressValid || !!errors.shopName || !!errors.address
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-primary hover:bg-secondary"
          }`}
        disabled={!isAddressValid || !!errors.shopName || !!errors.address}
      >
        Submit Location
      </button>
    </form>
  );
};

export default AddShopForm;
