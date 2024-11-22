import { useState } from "react";
import { handleLocationSubmit } from "../../services/addShop";
import { useShops } from "../../context/shopContext";
import ModalWrapper from "./ModalWrapper";
import GetCoordinatesAndAddressDetails from "../../services/geolocation";
import { AddAShopPayload, LocationData } from "../../types/dataTypes";
import { yupResolver } from "@hookform/resolvers/yup";
import { SubmitHandler, useForm } from "react-hook-form";
import { locationSchema } from "../../services/validators";

interface LocationSubmitProps {
  onClose: () => void;
}

const LocationSubmit = ({ onClose }: LocationSubmitProps) => {
  const { setShops, setLocations } = useShops();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(false);

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
      house_number: "",
      road: "",
      city: "",
      state: "",
      postcode: "",
      country: "",
      latitude: 0,
      longitude: 0,
    },
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 5000);
  };

  /**
   * Tries to prefill the address fields with data from OpenStreetMap given an
   * address.
   *
   * @returns {Promise<void>}
   */
  const prefillAddressFields = async () => {
    const address = getValues("address").trim();
    if (!address) {
      setIsAddressValid(false);
      showToast("Please enter an address before prefilling.", "error");
      return;
    }

    try {
      const addressDetails = await GetCoordinatesAndAddressDetails(address);

      if (addressDetails) {
        setValue("house_number", addressDetails.components.house_number || "");
        setValue("road", addressDetails.components.road || "");
        setValue("city", addressDetails.components.city || "");
        setValue("state", addressDetails.components.state || "");
        setValue("postcode", addressDetails.components.postcode || "");
        setValue("country", addressDetails.components.country || "");
        setValue("latitude", addressDetails.coordinates.latitude);
        setValue("longitude", addressDetails.coordinates.longitude);
        setIsAddressValid(true);
        showToast("Address details have been prefilled.", "success");
      } else {
        setIsAddressValid(false);
        showToast(
          "Address not found. Please try a different address.",
          "error",
        );
      }
    } catch (error: unknown) {
      console.error("Error fetching address details:", error);

      if (error instanceof Error) {
        setIsAddressValid(false);
        showToast(
          `Failed to fetch address details: ${error.message}. Please try again.`,
          "error",
        );
      } else {
        setIsAddressValid(false);
        showToast("An unexpected error occurred. Please try again.", "error");
      }
    }
  };

  const onSubmit: SubmitHandler<AddAShopPayload> = async (data) => {
    if (!isAddressValid) {
      showToast(
        "Please prefill and validate the address before submitting.",
        "error",
      );
      return;
    }

    const success = await handleLocationSubmit(
      data,
      showToast,
      setShops,
      setLocations,
    );
    if (success) onClose();
  };

  return (
    <ModalWrapper toastMessage={toastMessage} toastType={toastType}>
      <div className="max-w-3xl w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-secondary">
          <h3 className="text-lg font-semibold text-dark">
            Add A Sandwich Shop
          </h3>
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
            <input
              type="text"
              {...register("shopName")}
              className={`w-full p-2 border rounded-lg bg-white text-dark ${
                errors.shopName ? "border-red-500" : "border-secondary"
              }`}
            />
            {errors.shopName && (
              <p className="text-red-500 text-sm">{errors.shopName.message}</p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-dark">
              Shop Description
            </label>
            <input
              type="text"
              {...register("shop_description")}
              className={`w-full p-2 border rounded-lg bg-white text-dark ${
                errors.shop_description ? "border-red-500" : "border-secondary"
              }`}
            />
            {errors.shop_description && (
              <p className="text-red-500 text-sm">
                {errors.shop_description.message}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-dark">
              Address
            </label>
            <input
              type="text"
              {...register("address")}
              className={`w-full p-2 border rounded-lg bg-white text-dark ${
                errors.address ? "border-red-500" : "border-secondary"
              }`}
            />
            {errors.address && (
              <p className="text-red-500 text-sm">{errors.address.message}</p>
            )}
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
              onClick={() => setIsManualEntry((prev) => !prev)}
              className="w-full px-4 py-2 text-primary bg-white border border-primary rounded-lg hover:bg-gray-100"
            >
              {isManualEntry ? "Hide Manual Entry" : "Manually Enter Data"}
            </button>
          </div>

          {isManualEntry && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                { name: "house_number", label: "Street Number" },
                { name: "road", label: "Road" },
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
