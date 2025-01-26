import { useEffect, useState } from "react";
import { handleLocationSubmit } from "../../services/submitLocationShop";
import { useShops } from "../../context/shopContext";
import ModalWrapper from "./ModalWrapper";
import {
  GetCoordinatesAndAddressDetails,
  MapBoxLocationLookup,
} from "../../services/geolocation";
import { AddAShopPayload, Callback, LocationData } from "../../types/dataTypes";
import { yupResolver } from "@hookform/resolvers/yup";
import { SubmitHandler, useForm } from "react-hook-form";
import { locationSchema } from "../../constants/validators";
import Select from "react-select";
import { useToast } from "../../context/toastContext";
import { useAuth } from "../../context/authContext";
import { useNavigate } from "react-router-dom";
import EnhancedInput from "@components/Utilites/EnhancedInput";
import { Category, GetCategories } from "@/services/categoryService";

interface LocationSubmitProps {
  onClose: Callback;
}

const LocationSubmit = ({ onClose }: LocationSubmitProps) => {
  const { setShops, setLocations } = useShops();
  const { addToast } = useToast();
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AddAShopPayload>({
    resolver: yupResolver(locationSchema),
    defaultValues: {
      shopName: "",
      address: "",
      address_first: "",
      address_second: "",
      house_number: "",
      city: "",
      state: "",
      postcode: "",
      country: "",
      latitude: 0,
      longitude: 0,
      categoryIds: [],
    },
  });

  const isManualEntryValid = (): boolean => {
    const houseNumber = getValues("house_number")?.trim();
    const street = getValues("address_first")?.trim();
    const city = getValues("city")?.trim();
    const state = getValues("state")?.trim();
    const postcode = getValues("postcode")?.trim();
    const country = getValues("country")?.trim();

    return !!(houseNumber && street && city && state && postcode && country);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const data = await GetCategories();
      setCategories(data);
    };
    fetchCategories();
  }, []);

  /**
   * Tries to prefill the address fields with data from OpenStreetMap given an
   * address. If it fails, falls back to MapBox API as a backup.
   */
  const prefillAddressFields = async () => {
    const address = getValues("address")?.trim();
    const manualEntryValid = isManualEntryValid();

    if (!address && !manualEntryValid) {
      setIsAddressValid(false);
      addToast(
        "Please enter a valid address or complete the manual form.",
        "error",
      );
      return;
    }

    try {
      let addressDetails = null;

      if (address) {
        addressDetails = await GetCoordinatesAndAddressDetails(address);

        if (!addressDetails) {
          console.warn(
            "Nominatim API returned no results. Falling back to MapBox.",
          );
          addressDetails = await MapBoxLocationLookup(address);
        }
      }

      if (addressDetails) {
        setValue("house_number", addressDetails.components.house_number || "");
        setValue("address_first", addressDetails.components.road || "");
        setValue(
          "city",
          addressDetails.components.city ||
            addressDetails.components.town ||
            "",
        );
        setValue("state", addressDetails.components.state || "");
        setValue("postcode", addressDetails.components.postcode || "");
        setValue("country", addressDetails.components.country || "");
        setValue("latitude", addressDetails.coordinates.latitude);
        setValue("longitude", addressDetails.coordinates.longitude);
        setIsAddressValid(true);
        addToast("Address details have been prefilled.", "success");
      } else if (manualEntryValid) {
        setIsAddressValid(true);
        addToast("Using manually entered data.", "success");
      } else {
        setIsAddressValid(false);
        addToast("Address not found and manual entry is incomplete.", "error");
      }
    } catch (error: unknown) {
      console.error("Error fetching address details:", error);

      if (error instanceof Error) {
        setIsAddressValid(false);
        addToast(
          `Failed to fetch address details: ${error.message}. Please try again.`,
          "error",
        );
      } else {
        setIsAddressValid(false);
        addToast("An unexpected error occurred. Please try again.", "error");
      }
    }
  };

  const onSubmit: SubmitHandler<AddAShopPayload> = async (data) => {
    if (!isAddressValid) {
      addToast(
        "Please prefill and validate the address before submitting.",
        "error",
      );
      return;
    }
    data.categoryIds = selectedCategories;
    const success = await handleLocationSubmit(
      data,
      setShops,
      setLocations,
      addToast,
      logout,
      navigate,
    );
    if (success) onClose();
  };

  const handledManualEntry = () => {
    setIsManualEntry((prev) => !prev);
    setIsAddressValid(true);
  };

  return (
    <ModalWrapper size="large">
      <div className="max-w-3xl w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-secondary">
          <div>
            <h3 className="text-lg font-semibold text-dark">
              Add A Sandwich Shop
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-dark hover:bg-accent/10 rounded-lg text-sm w-8 h-8 flex items-center justify-center"
          >
            <span className="sr-only">Close modal</span>✕
          </button>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-4 space-y-4 max-h-[75vh] overflow-y-auto"
        >
          <div>
            <label className="block mb-2 text-sm font-medium text-dark">
              Shop Name
            </label>
            <EnhancedInput
              name="shopName"
              placeholder="Enter shop name"
              register={register}
              setValue={setValue}
              errors={errors}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-dark">
              Shop Description
            </label>
            <EnhancedInput
              name="shop_description"
              placeholder="Enter shop description"
              register={register}
              setValue={setValue}
              errors={errors}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-dark">
              Select Categories
            </label>
            <Select
              placeholder="Search"
              isMulti
              options={categories.map((category) => ({
                value: category.id,
                label: category.category_name,
              }))}
              onChange={(selectedOptions) =>
                setSelectedCategories(
                  selectedOptions.map((option) => option.value as number),
                )
              }
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

          <div>
            <label className="block mb-2 text-sm font-medium text-dark">
              Address
            </label>
            <EnhancedInput
              name="address"
              placeholder="Enter address"
              register={register}
              setValue={setValue}
              errors={errors}
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={prefillAddressFields}
              className={
                "w-full px-4 py-2 rounded-lg bg-primary text-white hover:bg-secondary"
              }
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                { name: "house_number", label: "Street Number" },
                { name: "address_first", label: "Address Line 1" },
                { name: "address_second", label: "Address Line 2" },
                { name: "city", label: "City" },
                { name: "state", label: "State" },
                { name: "postcode", label: "Postcode" },
                { name: "country", label: "Country" },
                {
                  name: "latitude",
                  label: "Latitude",
                  type: "number",
                  step: "any",
                },
                {
                  name: "longitude",
                  label: "Longitude",
                  type: "number",
                  step: "any",
                },
              ].map(({ name, label, type = "text", step }) => (
                <div key={name}>
                  <label className="block mb-2 text-sm font-medium text-dark">
                    {label}
                  </label>
                  <input
                    type={type}
                    step={step}
                    {...register(name as keyof LocationData)}
                    className={`w-full p-2 border rounded-lg bg-white text-dark ${
                      errors[name as keyof LocationData]
                        ? "border-red-500"
                        : "border-secondary"
                    }`}
                  />
                  {errors[name as keyof LocationData] && (
                    <p className="text-red-500 text-sm">
                      {errors[name as keyof LocationData]?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            type="submit"
            className={`w-full px-4 py-2 rounded-lg text-white ${
              !isAddressValid || errors.shopName || errors.address
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary hover:bg-secondary"
            }`}
            disabled={!isAddressValid || !!errors.shopName || !!errors.address}
          >
            Submit Location
          </button>
        </form>
      </div>
    </ModalWrapper>
  );
};

export default LocationSubmit;
