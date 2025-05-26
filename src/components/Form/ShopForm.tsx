import Select from "react-select";
import { Category } from "@/services/categoryService";
import { useAddShopForm } from "@/hooks/useAddShopForm";
import InputField from "../Utilites/InputField";
import ManualAddressFields from "../Utilites/ManualAddressFields";
import { AddAShopPayload } from "@/types/dataTypes";
import { InputMask } from "@react-input/mask";

type ShopFormProps = {
  initialData?: Partial<AddAShopPayload>;
  mode: "add" | "edit";
  address: string;
  onAddressChange: (value: string) => void;
};

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
    selectedCategories,
    setSelectedCategories,
  } = useAddShopForm(initialData, mode);

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

      <InputField name="phone" label="Phone" errors={errors}>
        <InputMask
          mask="(___) ___-____"
          replacement={{ _: /\d/ }}
          placeholder="(123) 456-7890"
          {...register("phone")}
          className={`w-full p-2 border rounded-lg bg-white text-dark ${
            errors.phone ? "border-red-500" : "border-secondary"
          }`}
        />
      </InputField>

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
        value={address}
        placeholder="Enter address"
        onChange={(e) => onAddressChange(e.target.value)}
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
        className={`w-full px-4 py-2 rounded-lg text-white ${
          !isAddressValid || !!errors.shopName || !!errors.address
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-primary hover:bg-secondary"
        }`}
        disabled={!isAddressValid || !!errors.shopName || !!errors.address}
      >
        {mode === "edit" ? "Update Location" : "Submit Location"}
      </button>
    </form>
  );
};

export default ShopForm;
