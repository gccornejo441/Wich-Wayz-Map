import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import { useShops } from "@context/shopContext";
import { useToast } from "@context/toastContext";
import { useAuth } from "@context/authContext";
import { handleLocationSubmit } from "@/services/submitLocationShop";
import { GetCategories, Category } from "@/services/categoryService";
import {
  GetCoordinatesAndAddressDetails,
  MapBoxLocationLookup,
} from "@/services/geolocation";
import { AddAShopPayload, ShopWithId } from "@/types/dataTypes";
import { locationSchema } from "@constants/validators";
import { ShopGeoJsonProperties } from "@/components/Map/MapBox";

type ShopInitialData = Partial<ShopWithId> & Partial<ShopGeoJsonProperties>;

export const useAddShopForm = (
  initialData?: ShopInitialData,
  mode: "add" | "edit" = "add",
) => {
  const { setShops, setLocations, updateShopInContext } = useShops();
  const { addToast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AddAShopPayload>({
    resolver: yupResolver(locationSchema),
    defaultValues: {
      shopName: initialData?.shopName || "",
      shop_description: initialData?.shop_description || "",
      address: initialData?.address || "",
      website_url: initialData?.website_url || "",
      phone: initialData?.phone || "",
      address_first: initialData?.address_first || "",
      address_second: initialData?.address_second || "",
      house_number: initialData?.house_number || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      postcode: initialData?.postcode || "",
      country: initialData?.country || "",
      latitude: initialData?.latitude || 0,
      longitude: initialData?.longitude || 0,
      categoryIds: initialData?.categoryIds || [],
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const data = await GetCategories();
      setCategories(data);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (initialData) {
      const normalizedData: Partial<AddAShopPayload> = {
        shopName: initialData.shopName ?? "",
        shop_description:
          initialData.shop_description ?? initialData.description ?? "",
        website_url: initialData.website_url ?? initialData.website ?? "",
        phone: initialData.phone ?? "",
        address: initialData.address ?? "",
        address_first: initialData.address_first ?? "",
        address_second: initialData.address_second ?? "",
        house_number: initialData.house_number ?? "",
        city: initialData.city ?? "",
        state: initialData.state ?? "",
        postcode: initialData.postcode ?? "",
        country: initialData.country ?? "",
        latitude: initialData.latitude ?? 0,
        longitude: initialData.longitude ?? 0,
        categoryIds: initialData.categoryIds ?? [],
      };

      for (const [key, value] of Object.entries(normalizedData)) {
        if (value !== undefined) {
          setValue(key as keyof AddAShopPayload, value);
        }
      }

      if (
        !initialData.categoryIds &&
        typeof initialData.categories === "string"
      ) {
        const categoryNames = initialData.categories
          .split(",")
          .map((c: string) => c.trim().toLowerCase());

        const matchedIds = categories
          .filter((cat) =>
            categoryNames.includes(cat.category_name.toLowerCase()),
          )
          .map((cat) => cat.id!);

        setSelectedCategories(matchedIds);
      } else if (initialData.categoryIds) {
        setSelectedCategories(initialData.categoryIds);
      }
    }
  }, [initialData, categories, setValue]);

  const isManualEntryValid = (): boolean => {
    const houseNumber = getValues("house_number")?.trim();
    const street = getValues("address_first")?.trim();
    const city = getValues("city")?.trim();
    const state = getValues("state")?.trim();
    const postcode = getValues("postcode")?.trim();
    const country = getValues("country")?.trim();

    return !!(houseNumber && street && city && state && postcode && country);
  };

  const handledManualEntry = () => {
    setIsManualEntry((prev) => !prev);
    setIsAddressValid(isManualEntryValid());
  };

  const prefillAddressFields = async () => {
    const address = getValues("address")?.trim();

    if (!address) {
      addToast("Please enter an address to prefill.", "error");
      return;
    }

    if (!address && !isManualEntryValid()) {
      setIsAddressValid(false);
      addToast(
        "Please enter a valid address or complete the manual form.",
        "error",
      );
      return;
    }

    try {
      let addressDetails = await GetCoordinatesAndAddressDetails(address);

      if (!addressDetails) {
        console.warn("Nominatim returned no results. Falling back to MapBox.");
        addressDetails = await MapBoxLocationLookup(address);
      }

      if (addressDetails) {
        setValue("house_number", addressDetails.components.house_number || "");
        setValue(
          "address_first",
          addressDetails.components.street ||
            addressDetails.components.road ||
            "",
        );
        setValue(
          "address_second",
          addressDetails.components.secondary_address || "",
        );
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
      } else {
        setIsAddressValid(false);
        addToast("Address not found.", "error");
      }
    } catch (error) {
      console.error("Error fetching address details:", error);
      setIsAddressValid(false);
      addToast("Failed to fetch address details. Please try again.", "error");
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
    const shopId = (initialData as { shopId?: number })?.shopId;

    if (mode === "edit" && shopId) {
      try {
        const { updateShop } = await import("@/services/updateShop");
        const updatedShop = await updateShop(shopId, data);

        if (updatedShop) {
          addToast("Shop updated successfully!", "success");
          updateShopInContext(updatedShop);
          navigate("/");
        } else {
          addToast("Failed to update shop.", "error");
        }
      } catch (error) {
        console.error("Update failed:", error);
        addToast("Failed to update shop.", "error");
      }

      return;
    }

    const success = await handleLocationSubmit(
      data,
      setShops,
      setLocations,
      addToast,
      logout,
      navigate,
    );

    if (success) {
      navigate("/");
    }
  };

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isManualEntry,
    handledManualEntry,
    prefillAddressFields,
    isAddressValid,
    categories,
    setCategories,
    selectedCategories,
    setSelectedCategories,
  };
};
