import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import { useShops } from "@context/shopContext";
import { useToast } from "@context/toastContext";
import { useAuth } from "@context/authContext";
import { useShopSidebar } from "@context/ShopSidebarContext";
import { handleLocationSubmit } from "@/services/submitLocationShop";
import { GetCategories } from "@/services/categoryService";
import { Category } from "@models/Category";
import {
  GetCoordinatesAndAddressDetails,
  MapBoxLocationLookup,
  MapBoxMultipleLocationLookup,
} from "@/services/geolocation";
import { AddAShopPayload, ShopWithId } from "@/types/dataTypes";
import { AddressDraft } from "@/types/address";
import { locationSchema } from "@constants/validators";
import { ShopGeoJsonProperties } from "@utils/shopGeoJson";
import {
  normalizeZip,
  normalizeState,
  coerceNumber,
} from "@/utils/normalizers";

type ShopInitialData = Partial<ShopWithId> & Partial<ShopGeoJsonProperties>;

const hasValidCoords = (lat: number, lon: number): boolean => {
  if (lat === 0 && lon === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  return true;
};

const normalizeInitialData = (
  initialData?: ShopInitialData,
): AddAShopPayload => {
  if (!initialData) {
    return {
      shopName: "",
      shop_description: "",
      address: "",
      website_url: "",
      phone: "",
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
    };
  }

  const normalizedState = normalizeState(initialData.state);
  const normalizedPostcode = normalizeZip(initialData.postcode);
  const lat = coerceNumber(initialData.latitude);
  const lon = coerceNumber(initialData.longitude);

  let categoryIds: number[] = [];
  if (initialData.categoryIds) {
    categoryIds = initialData.categoryIds;
  }

  return {
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
    state: normalizedState,
    postcode: normalizedPostcode,
    country: initialData.country ?? "",
    latitude: lat,
    longitude: lon,
    categoryIds,
  };
};

export const useAddShopForm = (
  initialData?: ShopInitialData,
  mode: "add" | "edit" = "add",
) => {
  const { setShops, setLocations, updateShopInContext } = useShops();
  const { addToast } = useToast();
  const { logout } = useAuth();
  const { selectShop } = useShopSidebar();
  const navigate = useNavigate();

  const [isAddressValid, setIsAddressValid] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<AddAShopPayload>({
    resolver: yupResolver(locationSchema),
    defaultValues: normalizeInitialData(initialData),
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
      const normalized = normalizeInitialData(initialData);
      reset(normalized, { keepDefaultValues: false });

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
  }, [initialData, categories, reset]);

  const addressVal = watch("address");
  const latVal = watch("latitude");
  const lonVal = watch("longitude");

  useEffect(() => {
    const a = (addressVal ?? "").trim();
    const lat = coerceNumber(latVal);
    const lon = coerceNumber(lonVal);
    setIsAddressValid(Boolean(a) && hasValidCoords(lat, lon));
  }, [addressVal, latVal, lonVal]);

  const applyParsedAddressToForm = (parsed: {
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
  }) => {
    const house = (parsed.components.house_number || "").trim();
    const street = (
      parsed.components.street ||
      parsed.components.road ||
      ""
    ).trim();

    const line1 = [house, street].filter(Boolean).join(" ").trim();

    setValue("house_number", house, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("address_first", street, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("address", line1, { shouldDirty: true, shouldValidate: true });
    setValue("address_second", parsed.components.secondary_address || "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("city", parsed.components.city || parsed.components.town || "", {
      shouldDirty: true,
      shouldValidate: true,
    });

    const normalizedState = normalizeState(parsed.components.state);
    setValue("state", normalizedState, {
      shouldDirty: true,
      shouldValidate: true,
    });

    const normalizedPostcode = normalizeZip(parsed.components.postcode);
    setValue("postcode", normalizedPostcode, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setValue("country", parsed.components.country || "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("latitude", parsed.coordinates.latitude, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("longitude", parsed.coordinates.longitude, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const formatAddressFromComponents = (components: {
    house_number?: string;
    street?: string;
    road?: string;
    city?: string;
    town?: string;
    state?: string;
    postcode?: string;
  }): string => {
    const house = (components.house_number || "").trim();
    const street = (components.street || components.road || "").trim();
    const city = (components.city || components.town || "").trim();
    const state = (components.state || "").trim();
    const postcode = (components.postcode || "").trim();

    const parts = [
      [house, street].filter(Boolean).join(" ").trim(),
      city,
      state,
      postcode,
    ].filter(Boolean);

    return parts.join(", ");
  };

  const buildUsQueryFromForm = () => {
    const line1 = (getValues("address") ?? "").trim();
    const city = (getValues("city") ?? "").trim();
    const stateCode = normalizeState(getValues("state"));
    const zip = normalizeZip(getValues("postcode"));

    if (!stateCode) return null;

    const q = [line1, city, stateCode, zip].filter(Boolean).join(" ").trim();
    return { q, stateCode };
  };

  const searchAddressSuggestions = async (): Promise<{
    success: boolean;
    suggestions?: Array<{
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
    }>;
  }> => {
    const built = buildUsQueryFromForm();
    if (!built) {
      addToast("State is required (US only).", "error");
      return { success: false };
    }

    if (!built.q) {
      addToast("Please enter an address to search.", "error");
      return { success: false };
    }

    try {
      const results = await MapBoxMultipleLocationLookup(built.q, {
        types: "address",
        limit: 5,
      });

      const filtered = results.filter((r) => {
        const stateCode = normalizeState(r.components.state);
        return stateCode === built.stateCode;
      });

      if (filtered.length === 0) {
        addToast("No addresses found for the selected state.", "error");
        return { success: false };
      }

      const suggestions = filtered.map((result) => ({
        formattedAddress: formatAddressFromComponents(result.components),
        parsedData: result,
      }));

      return { success: true, suggestions };
    } catch (error) {
      console.error("Error searching addresses:", error);
      addToast("Failed to search addresses. Please try again.", "error");
      return { success: false };
    }
  };

  const prefillAddressFields = async (): Promise<{
    success: boolean;
    formattedAddress?: string;
  }> => {
    const raw = getValues("address")?.trim();

    if (!raw) {
      addToast("Please enter an address to prefill.", "error");
      return { success: false };
    }

    try {
      let addressDetails = await GetCoordinatesAndAddressDetails(raw);

      if (!addressDetails) {
        addressDetails = await MapBoxLocationLookup(raw);
      }

      if (!addressDetails) {
        addToast(
          "Please enter a valid US address that includes a state.",
          "error",
        );
        return { success: false };
      }

      applyParsedAddressToForm(addressDetails);

      const formattedAddress = formatAddressFromComponents(
        addressDetails.components,
      );

      addToast("Address details have been prefilled.", "success");
      return { success: true, formattedAddress };
    } catch (error) {
      console.error("Error fetching address details:", error);
      addToast("Failed to fetch address details. Please try again.", "error");
      return { success: false };
    }
  };

  const onSubmit: SubmitHandler<AddAShopPayload> = async (data) => {
    if (!isAddressValid) {
      addToast(
        "Please prefill the address or set coordinates before submitting.",
        "error",
      );
      return;
    }

    data.categoryIds = selectedCategories;
    data.postcode = normalizeZip(data.postcode);
    data.state = normalizeState(data.state);

    const shopId = (initialData as { shopId?: number })?.shopId;

    if (mode === "edit" && shopId) {
      try {
        const { updateShop } = await import("@/services/updateShop");
        const addressDraft: AddressDraft = {
          streetAddress: data.address ?? "",
          streetAddressSecond: data.address_second ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          postalCode: data.postcode ?? "",
          country: data.country ?? "",
          latitude: data.latitude ?? 0,
          longitude: data.longitude ?? 0,
        };
        const updatedShop = await updateShop(shopId, data, addressDraft);

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

    const addressDraft: AddressDraft = {
      streetAddress: data.address ?? "",
      streetAddressSecond: data.address_second ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      postalCode: data.postcode ?? "",
      country: data.country ?? "",
      latitude: data.latitude ?? 0,
      longitude: data.longitude ?? 0,
    };

    const success = await handleLocationSubmit(
      data,
      addressDraft,
      setShops,
      setLocations,
      addToast,
      logout,
      navigate,
      selectShop,
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
    prefillAddressFields,
    searchAddressSuggestions,
    applyParsedAddressToForm,
    formatAddressFromComponents,
    isAddressValid,
    categories,
    setCategories,
    selectedCategories,
    setSelectedCategories,
    setValue,
    watch,
    control,
    getValues,
  };
};
