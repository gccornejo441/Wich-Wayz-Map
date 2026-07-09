import Select, { GroupBase, MultiValue, StylesConfig } from "react-select";
import { InputMask } from "@react-input/mask";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { HiTrash, HiMap, HiSave, HiSparkles, HiRefresh } from "react-icons/hi";

import { useAddShopForm } from "@/hooks/useAddShopForm";
import { useChromeAI } from "@/hooks/useChromeAI";
import { coerceNumber } from "@/utils/normalizers";
import { useTheme } from "@hooks/useTheme";
import AddCategoryModal from "@components/Modal/AddCategoryModal";

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
import { buildDeepLink } from "@utils/deepLink";
import { ShopWithUser } from "@models/ShopWithUser";
import { MapBoxLocationLookup } from "@/services/geolocation";

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

const toNullableCoordinate = (value: unknown): number | null => {
  if (value === null || typeof value === "undefined") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return coerceNumber(value);
};

const ADD_SHOP_DRAFT_KEY = "wich-wayz-add-shop-draft";
const ADD_SHOP_DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const DUPLICATE_WARNING_RADIUS_MILES = 0.1;
const DUPLICATE_WARNING_NAME_SIMILARITY = 0.7;

type AddShopDraft = {
  values: Partial<AddAShopPayload>;
  selectedCategories: number[];
  updatedAt: number;
};

type DuplicateCandidate = {
  shop: ShopWithUser;
  locationId?: number;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  signature: string;
};

const draftFields: Array<keyof AddAShopPayload> = [
  "shopName",
  "shop_description",
  "address",
  "website_url",
  "phone",
  "address_first",
  "address_second",
  "house_number",
  "city",
  "state",
  "postcode",
  "country",
  "latitude",
  "longitude",
  "chain_attestation",
  "estimated_location_count",
  "eligibility_confirmed",
  "categoryIds",
];

const meaningfulDraftFields: Array<keyof AddAShopPayload> = [
  "shopName",
  "shop_description",
  "address",
  "website_url",
  "phone",
  "address_first",
  "address_second",
  "house_number",
  "city",
  "state",
  "postcode",
  "country",
  "latitude",
  "longitude",
  "categoryIds",
];

const hasUsableDraft = (draft: AddShopDraft) =>
  Boolean(
    draft.selectedCategories.length ||
    meaningfulDraftFields.some((field) => {
      const value = draft.values[field];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "number") return value !== 0;
      return typeof value === "string" && value.trim().length > 0;
    }),
  );

const isStaleDraft = (draft: AddShopDraft) =>
  typeof draft.updatedAt === "number" &&
  Date.now() - draft.updatedAt > ADD_SHOP_DRAFT_MAX_AGE_MS;

const normalizeForMatch = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|shop|sandwich|sandwiches|deli|restaurant)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getNameSimilarity = (left: string, right: string) => {
  const a = normalizeForMatch(left);
  const b = normalizeForMatch(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;

  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const shared = [...aTokens].filter((token) => bTokens.has(token)).length;
  return shared / Math.max(aTokens.size, bTokens.size);
};

const distanceMiles = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const radiusMiles = 3958.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return radiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (miles: number) =>
  miles < 0.1 ? "less than 0.1 mi" : `${miles.toFixed(1)} mi`;

const buildDuplicateSignature = (
  shopId: number | undefined,
  locationId: number | undefined,
  candidateLatitude: number,
  candidateLongitude: number,
  currentName: string,
  currentLatitude: number,
  currentLongitude: number,
) =>
  [
    shopId ?? "shop",
    locationId ??
      `${candidateLatitude.toFixed(5)},${candidateLongitude.toFixed(5)}`,
    normalizeForMatch(currentName),
    currentLatitude.toFixed(4),
    currentLongitude.toFixed(4),
  ].join("|");

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
    watch,
    control,
    getValues,
  } = useAddShopForm(initialData, mode);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const { isAuthenticated, userMetadata } = useAuth();
  const { addToast } = useToast();
  const { updateShopInContext, shops } = useShops();
  const {
    writerAvailable,
    rewriterAvailable,
    isGenerating,
    isRewriting,
    generateDescription,
    rewriteDescription,
  } = useChromeAI();

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
  const [isManualAddressOpen, setIsManualAddressOpen] = useState(
    mode === "add",
  );
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [dismissedDuplicateSignatures, setDismissedDuplicateSignatures] =
    useState<Set<string>>(() => new Set());
  const draftHydratedKeyRef = useRef<string | null>(
    mode === "edit" ? "edit" : null,
  );
  const autoGeocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
  const watchedAddress = watchedFields[0] as string | undefined;
  const draftValues = useWatch({ control });

  const derivedAddress: AddressDraft = {
    streetAddress: (watchedFields[0] as string) ?? "",
    streetAddressSecond: (watchedFields[1] as string) ?? "",
    city: (watchedFields[2] as string) ?? "",
    state: (watchedFields[3] as string) ?? "",
    postalCode: (watchedFields[4] as string) ?? "",
    country: (watchedFields[5] as string) ?? "",
    latitude: toNullableCoordinate(watchedFields[6]),
    longitude: toNullableCoordinate(watchedFields[7]),
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

  useEffect(() => {
    if (autoGeocodeTimerRef.current) clearTimeout(autoGeocodeTimerRef.current);

    const address = watchedAddress ?? "";
    if (!address.trim() || mode !== "add") return;

    autoGeocodeTimerRef.current = setTimeout(async () => {
      try {
        const result = await MapBoxLocationLookup(address, { limit: 1 });
        if (!result) return;
        setValue("latitude", result.coordinates.latitude, {
          shouldDirty: true,
        });
        setValue("longitude", result.coordinates.longitude, {
          shouldDirty: true,
        });
      } catch {
        // Silently fail — user can click "Recalculate pin" manually
      }
    }, 800);

    return () => {
      if (autoGeocodeTimerRef.current)
        clearTimeout(autoGeocodeTimerRef.current);
    };
  }, [watchedAddress, mode, setValue]);

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
  const chainAttestation = watch("chain_attestation");
  const estimatedLocationCount = watch("estimated_location_count");
  const eligibilityConfirmed = watch("eligibility_confirmed");
  const watchedShopName = watch("shopName") ?? "";
  const watchedDescription = watch("shop_description") ?? "";
  const watchedWebsite = watch("website_url") ?? "";
  const watchedPhone = watch("phone") ?? "";

  const isExplicitlyIneligible =
    mode === "add" &&
    (chainAttestation === "yes" || estimatedLocationCount === "gte10");

  const fullAddressForMaps = useMemo(
    () =>
      [
        derivedAddress.streetAddress,
        derivedAddress.streetAddressSecond,
        derivedAddress.city,
        derivedAddress.state,
        derivedAddress.postalCode,
        derivedAddress.country,
      ]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(", "),
    [
      derivedAddress.streetAddress,
      derivedAddress.streetAddressSecond,
      derivedAddress.city,
      derivedAddress.state,
      derivedAddress.postalCode,
      derivedAddress.country,
    ],
  );

  const categoryOptions: CategoryOption[] = categories.map((cat) => ({
    value: cat.id!,
    label: cat.category_name,
  }));

  const selectedOptions: CategoryOption[] = categoryOptions.filter((opt) =>
    selectedCategories.includes(opt.value),
  );

  const draftStorageKey = useMemo(
    () => `${ADD_SHOP_DRAFT_KEY}:${userMetadata?.id ?? "anonymous"}`,
    [userMetadata?.id],
  );

  const hasSelectedLocation =
    typeof derivedAddress.latitude === "number" &&
    typeof derivedAddress.longitude === "number" &&
    !(derivedAddress.latitude === 0 && derivedAddress.longitude === 0);

  const selectedLocationSummary =
    fullAddressForMaps ||
    (hasSelectedLocation
      ? `Lat: ${derivedAddress.latitude?.toFixed(5)}, Lng: ${derivedAddress.longitude?.toFixed(5)}`
      : "");

  const selectedCategoryLabels = selectedOptions.map((option) => option.label);

  const duplicateCandidate = useMemo<DuplicateCandidate | null>(() => {
    if (
      isEditMode ||
      !watchedShopName.trim() ||
      !hasSelectedLocation ||
      typeof derivedAddress.latitude !== "number" ||
      typeof derivedAddress.longitude !== "number"
    ) {
      return null;
    }

    const currentLatitude = derivedAddress.latitude;
    const currentLongitude = derivedAddress.longitude;
    let best: DuplicateCandidate | null = null;

    for (const shop of shops) {
      const similarity = getNameSimilarity(watchedShopName, shop.name);
      if (similarity < DUPLICATE_WARNING_NAME_SIMILARITY) continue;

      const locations =
        shop.locations && shop.locations.length
          ? shop.locations
          : shop.latitude !== undefined && shop.longitude !== undefined
            ? [
                {
                  latitude: shop.latitude,
                  longitude: shop.longitude,
                  postal_code: "",
                  street_address: "",
                  city: "",
                  state: "",
                  country: "",
                },
              ]
            : [];

      for (const location of locations) {
        const latitude = coerceNumber(location.latitude);
        const longitude = coerceNumber(location.longitude);
        if (latitude === 0 && longitude === 0) continue;

        const nextDistance = distanceMiles(
          currentLatitude,
          currentLongitude,
          latitude,
          longitude,
        );

        if (nextDistance > DUPLICATE_WARNING_RADIUS_MILES) continue;
        const signature = buildDuplicateSignature(
          shop.id,
          location.id,
          latitude,
          longitude,
          watchedShopName,
          currentLatitude,
          currentLongitude,
        );
        if (dismissedDuplicateSignatures.has(signature)) continue;
        if (!best || nextDistance < best.distanceMiles) {
          best = {
            shop,
            locationId: location.id,
            latitude,
            longitude,
            distanceMiles: nextDistance,
            signature,
          };
        }
      }
    }

    return best;
  }, [
    derivedAddress.latitude,
    derivedAddress.longitude,
    dismissedDuplicateSignatures,
    hasSelectedLocation,
    isEditMode,
    shops,
    watchedShopName,
  ]);

  useEffect(() => {
    if (mode !== "add" || typeof window === "undefined") return;
    if (draftHydratedKeyRef.current === draftStorageKey) return;

    const currentDraft: AddShopDraft = {
      values: getValues(),
      selectedCategories,
      updatedAt: Date.now(),
    };

    if (hasUsableDraft(currentDraft)) {
      draftHydratedKeyRef.current = draftStorageKey;
      return;
    }

    const storedDraft = window.localStorage.getItem(draftStorageKey);
    if (!storedDraft) {
      draftHydratedKeyRef.current = draftStorageKey;
      return;
    }

    try {
      const draft = JSON.parse(storedDraft) as AddShopDraft;
      if (isStaleDraft(draft)) {
        window.localStorage.removeItem(draftStorageKey);
        draftHydratedKeyRef.current = draftStorageKey;
        return;
      }

      if (!hasUsableDraft(draft)) {
        window.localStorage.removeItem(draftStorageKey);
        draftHydratedKeyRef.current = draftStorageKey;
        return;
      }

      draftFields.forEach((field) => {
        if (field in draft.values) {
          setValue(field, draft.values[field] as never, {
            shouldDirty: false,
            shouldValidate: true,
          });
        }
      });
      setSelectedCategories(draft.selectedCategories);
      setShowDraftBanner(true);
    } catch (error) {
      console.error("Failed to restore add shop draft:", error);
      window.localStorage.removeItem(draftStorageKey);
    } finally {
      draftHydratedKeyRef.current = draftStorageKey;
    }
  }, [
    draftStorageKey,
    getValues,
    mode,
    selectedCategories,
    setSelectedCategories,
    setValue,
  ]);

  useEffect(() => {
    if (
      mode !== "add" ||
      typeof window === "undefined" ||
      draftHydratedKeyRef.current !== draftStorageKey
    ) {
      return;
    }

    const values = getValues();
    const draft: AddShopDraft = {
      values,
      selectedCategories,
      updatedAt: Date.now(),
    };

    if (!hasUsableDraft(draft)) {
      window.localStorage.removeItem(draftStorageKey);
      return;
    }

    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draftStorageKey, draftValues, getValues, mode, selectedCategories]);

  const clearAddShopDraft = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKey);
      window.localStorage.removeItem(`${ADD_SHOP_DRAFT_KEY}:anonymous`);
      window.localStorage.removeItem(ADD_SHOP_DRAFT_KEY);
    }
    setShowDraftBanner(false);
  };

  const handleEligibilityChoice = (
    choice: "local" | "unsure" | "large-chain",
  ) => {
    if (choice === "local") {
      setValue("chain_attestation", "no", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("estimated_location_count", "lt10", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("eligibility_confirmed", true, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    if (choice === "unsure") {
      setValue("chain_attestation", "unsure", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("estimated_location_count", "unsure", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("eligibility_confirmed", true, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    setValue("chain_attestation", "yes", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("estimated_location_count", "gte10", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("eligibility_confirmed", false, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const eligibilityChoice: "local" | "unsure" | "large-chain" | null =
    chainAttestation === "yes" || estimatedLocationCount === "gte10"
      ? "large-chain"
      : !eligibilityConfirmed
        ? null
        : chainAttestation === "unsure" || estimatedLocationCount === "unsure"
          ? "unsure"
          : "local";

  const openDuplicateCandidate = () => {
    if (!duplicateCandidate?.shop.id) return;

    navigate(
      buildDeepLink(
        {
          lat: duplicateCandidate.latitude,
          lng: duplicateCandidate.longitude,
          z: 16,
          shopId: duplicateCandidate.shop.id,
        },
        "/",
      ),
    );
  };

  const handleFormSubmit = async (data: AddAShopPayload) => {
    setIsSubmitting(true);
    try {
      data.website_url = normalizeWebsiteUrl(String(data.website_url ?? ""));
      const didSubmit = await onSubmit(data);
      if (didSubmit === true && !isEditMode) {
        clearAddShopDraft();
      }

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

  const canRecalculatePin =
    Boolean(
      derivedAddress.streetAddress.trim() &&
      derivedAddress.city.trim() &&
      derivedAddress.state.trim() &&
      derivedAddress.postalCode.trim(),
    ) &&
    !isSubmitting &&
    addressLookupState !== "loading";

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setLookupMessage(suggestion.formattedAddress);
    setAddressLookupState("success");
    setAddressSuggestions([]);
    setPendingParsedAddress(suggestion.parsedData);
  };

  const handleUseSuggestionForPin = (suggestion: AddressSuggestion) => {
    commitParsedAddress(suggestion.parsedData);
    setLookupMessage(suggestion.formattedAddress);
    setAddressLookupState("success");
    setAddressSuggestions([]);
    setPendingParsedAddress(null);
    setAddressLocked(true);
    setIsManualAddressOpen(false);
  };

  const handleRecalculatePinFromAddress = async () => {
    setAddressLookupState("loading");
    setLookupMessage("");
    setAddressSuggestions([]);
    setPendingParsedAddress(null);

    const result = await searchAddressSuggestions();
    if (result.success && result.suggestions) {
      if (result.suggestions.length === 1) {
        handleUseSuggestionForPin(result.suggestions[0]);
      } else {
        setAddressSuggestions(result.suggestions);
        setAddressLookupState("suggestions");
        setIsManualAddressOpen(true);
      }
      return;
    }

    setAddressLookupState("error");
    setLookupMessage("No match found. Check address and try again.");
    setIsManualAddressOpen(true);
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

  const canSubmit =
    isAddressValid &&
    !errors.shopName &&
    !errors.address &&
    !isExplicitlyIneligible &&
    (isEditMode || eligibilityConfirmed);

  if (layoutMode === "map-section" && !isEditMode) {
    return (
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        data-testid="shop-form"
        className="flex flex-col border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-surface-darker"
      >
        <input type="hidden" {...register("chain_attestation")} />
        <input type="hidden" {...register("estimated_location_count")} />
        <input type="hidden" {...register("eligibility_confirmed")} />

        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-semibold text-text-base dark:text-text-inverted">
              Add New Shop
            </h4>
            <p className="text-xs text-text-muted dark:text-gray-300">
              Enter the address first, then fine-tune the pin if needed.
            </p>
          </div>
          {onNavigateToMap ? (
            <button
              type="button"
              onClick={onNavigateToMap}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-500 px-3 py-2 text-xs text-white transition hover:bg-gray-600"
            >
              <HiMap className="h-4 w-4" />
              To Map
            </button>
          ) : null}
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <section className="order-2 border-b border-gray-200 p-4 dark:border-gray-700 lg:order-1 lg:border-b-0 lg:border-r">
            <div className="overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
              <div className="flex flex-col gap-2 border-b border-gray-200 bg-surface-muted px-3 py-2 dark:border-gray-700 dark:bg-surface-darker sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-base dark:text-text-inverted">
                    Choose the location
                  </p>
                  <p className="text-[11px] text-text-muted dark:text-gray-300">
                    Recalculate from address, then click map or drag pin
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRecalculatePinFromAddress}
                  disabled={!canRecalculatePin}
                  className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    !canRecalculatePin
                      ? "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700"
                      : "bg-brand-primary text-white hover:bg-brand-secondary hover:text-gray-900"
                  }`}
                >
                  {addressLookupState === "loading"
                    ? "Recalculating..."
                    : "Recalculate pin"}
                </button>
              </div>
              <div className="h-[250px] md:h-[360px]">
                <MapPreview
                  address={derivedAddress}
                  fullAddressForMaps={fullAddressForMaps}
                  onAddressUpdate={handleMapAddressUpdate}
                  prefillFlyToNonce={0}
                  containerClassName="h-full"
                />
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-surface-muted p-3 dark:border-gray-700 dark:bg-surface-dark">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-base dark:text-text-inverted">
                    Selected location
                  </p>
                  <p className="mt-1 text-sm text-text-muted dark:text-gray-300">
                    {selectedLocationSummary ||
                      "Choose a spot on the map to set the shop address."}
                  </p>
                </div>
                {hasSelectedLocation ? (
                  <span className="rounded bg-green-100 px-2 py-1 text-[11px] font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    Pin set
                  </span>
                ) : null}
              </div>
              {hasSelectedLocation ? (
                <p className="mt-2 text-[11px] text-text-muted dark:text-gray-300">
                  Lat: {derivedAddress.latitude?.toFixed(5)} | Lng:{" "}
                  {derivedAddress.longitude?.toFixed(5)}
                </p>
              ) : null}
            </div>

            {duplicateCandidate ? (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                <p className="font-semibold">
                  Possible match nearby: {duplicateCandidate.shop.name} -{" "}
                  {formatDistance(duplicateCandidate.distanceMiles)} away. Is
                  this the same place?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openDuplicateCandidate}
                    className="rounded bg-amber-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-800"
                  >
                    Open existing shop
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDismissedDuplicateSignatures((prev) => {
                        const next = new Set(prev);
                        next.add(duplicateCandidate.signature);
                        return next;
                      })
                    }
                    className="rounded border border-amber-400 px-3 py-1.5 text-xs font-medium transition hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    Continue anyway
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="order-1 space-y-5 p-4 lg:order-2">
            {showDraftBanner ? (
              <div className="rounded-lg border border-brand-secondary bg-brand-secondary/15 px-3 py-2 text-sm text-text-base dark:text-text-inverted">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>Restored your unsent shop draft.</span>
                  <button
                    type="button"
                    onClick={clearAddShopDraft}
                    className="text-left text-xs font-medium text-brand-primary underline hover:text-brand-secondary"
                  >
                    Clear draft
                  </button>
                </div>
              </div>
            ) : null}

            <div>
              <h4 className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-text-base dark:border-gray-700 dark:text-text-inverted">
                Shop details
              </h4>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="shopName"
                    className="mb-1.5 block text-xs font-medium text-text-base dark:text-text-inverted"
                  >
                    Shop Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="shopName"
                    type="text"
                    placeholder="Enter shop name"
                    {...register("shopName")}
                    className={`w-full rounded-md border-2 bg-white px-3 py-2 text-sm text-text-base transition-colors focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-surface-dark dark:text-text-inverted ${
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
                    className="mb-1.5 block text-xs font-medium text-text-base dark:text-text-inverted"
                  >
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="shop_description"
                    rows={3}
                    placeholder="What makes this place worth adding?"
                    {...register("shop_description")}
                    className={`w-full resize-none rounded-md border-2 bg-white px-3 py-2 text-sm text-text-base transition-colors focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-surface-dark dark:text-text-inverted ${
                      errors.shop_description
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  {errors.shop_description && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.shop_description.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-text-base dark:text-text-inverted">
                  Address
                </h4>
                <button
                  type="button"
                  onClick={() => setIsManualAddressOpen((prev) => !prev)}
                  className="text-xs font-medium text-brand-primary underline hover:text-brand-secondary"
                >
                  {isManualAddressOpen
                    ? "View map confirmation"
                    : "Edit manually"}
                </button>
              </div>

              {!isManualAddressOpen ? (
                <div className="rounded-lg border border-gray-200 bg-surface-muted p-3 dark:border-gray-700 dark:bg-surface-dark">
                  <p className="text-xs font-semibold text-text-base dark:text-text-inverted">
                    {hasSelectedLocation
                      ? "Location confirmed"
                      : "No location selected yet"}
                  </p>
                  <p className="mt-1 text-sm text-text-muted dark:text-gray-300">
                    {selectedLocationSummary ||
                      "Use the map to choose the shop location."}
                  </p>
                  {!isAddressValid && (
                    <p className="mt-2 text-xs text-red-500">
                      City, state, ZIP, street, and valid coordinates are
                      required.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="address"
                      className="mb-1.5 block text-xs font-medium text-text-base dark:text-text-inverted"
                    >
                      Street
                    </label>
                    <input
                      id="address"
                      type="text"
                      placeholder="123 Main St"
                      {...register("address")}
                      className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm text-text-base transition-colors focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary dark:border-gray-600 dark:bg-surface-dark dark:text-text-inverted"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="address_second"
                      className="mb-1.5 block text-xs font-medium text-text-base dark:text-text-inverted"
                    >
                      Line 2
                    </label>
                    <input
                      id="address_second"
                      type="text"
                      placeholder="Apt, Suite"
                      {...register("address_second")}
                      className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm text-text-base transition-colors focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary dark:border-gray-600 dark:bg-surface-dark dark:text-text-inverted"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="city"
                      className="mb-1.5 block text-xs font-medium text-text-base dark:text-text-inverted"
                    >
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      placeholder="City"
                      {...register("city")}
                      className={`w-full rounded-md border-2 bg-white px-3 py-2 text-sm text-text-base transition-colors focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-surface-dark dark:text-text-inverted ${
                        errors.city
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.city.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="state"
                        className="mb-1.5 block text-xs font-medium text-text-base dark:text-text-inverted"
                      >
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="state"
                        {...register("state")}
                        className={`w-full rounded-md border-2 bg-white px-3 py-2 text-sm text-text-base transition-colors focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-surface-dark dark:text-text-inverted ${
                          errors.state
                            ? "border-red-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        <option value="">Select...</option>
                        {US_STATES.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.code}
                          </option>
                        ))}
                      </select>
                      {errors.state && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.state.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="postcode"
                        className="mb-1.5 block text-xs font-medium text-text-base dark:text-text-inverted"
                      >
                        ZIP <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="postcode"
                        type="text"
                        placeholder="12345"
                        {...register("postcode")}
                        className={`w-full rounded-md border-2 bg-white px-3 py-2 text-sm text-text-base transition-colors focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-surface-dark dark:text-text-inverted ${
                          errors.postcode
                            ? "border-red-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      />
                      {errors.postcode && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.postcode.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecalculatePinFromAddress}
                    disabled={!canRecalculatePin}
                    className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      !canRecalculatePin
                        ? "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700"
                        : "bg-brand-primary text-white hover:bg-brand-secondary hover:text-gray-900"
                    }`}
                  >
                    {addressLookupState === "loading"
                      ? "Recalculating pin..."
                      : "Recalculate pin from address"}
                  </button>

                  {addressLookupState === "suggestions" &&
                    addressSuggestions.length > 0 && (
                      <div className="space-y-2 rounded-lg border border-gray-300 bg-surface-muted p-2 dark:border-gray-600 dark:bg-surface-darker">
                        <p className="text-xs font-medium text-text-base dark:text-text-inverted">
                          Select the best match:
                        </p>
                        {addressSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() =>
                              handleUseSuggestionForPin(suggestion)
                            }
                            className="w-full rounded bg-white px-2 py-1.5 text-left text-xs text-text-base transition-colors hover:bg-brand-primary/10 dark:bg-surface-dark dark:text-text-inverted dark:hover:bg-brand-primary/20"
                          >
                            {suggestion.formattedAddress}
                          </button>
                        ))}
                      </div>
                    )}

                  {addressLookupState === "error" && lookupMessage && (
                    <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                      {lookupMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-text-base dark:border-gray-700 dark:text-text-inverted">
                Is this an independent or small local shop?
              </h4>
              <div className="grid gap-2">
                {[
                  {
                    id: "local",
                    label: "Yes, it is local/independent",
                  },
                  { id: "unsure", label: "I'm not sure" },
                  { id: "large-chain", label: "No, it is a large chain" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      handleEligibilityChoice(
                        option.id as "local" | "unsure" | "large-chain",
                      )
                    }
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      eligibilityChoice === option.id
                        ? "border-brand-primary bg-brand-primary/10 text-text-base dark:text-text-inverted"
                        : "border-gray-300 bg-white text-text-base hover:border-brand-primary dark:border-gray-600 dark:bg-surface-dark dark:text-text-inverted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {eligibilityChoice === "unsure" && !isExplicitlyIneligible ? (
                <p className="mt-2 text-xs text-text-muted dark:text-gray-300">
                  You can still submit it; the review step will verify
                  eligibility.
                </p>
              ) : null}
              {!eligibilityConfirmed && !isExplicitlyIneligible ? (
                <p className="mt-2 text-xs text-red-500">
                  Please confirm this shop is eligible to submit.
                </p>
              ) : null}
              {(errors.chain_attestation ||
                errors.estimated_location_count ||
                errors.eligibility_confirmed) && (
                <p className="mt-2 text-xs text-red-500">
                  {errors.chain_attestation?.message ||
                    errors.estimated_location_count?.message ||
                    errors.eligibility_confirmed?.message}
                </p>
              )}
              {isExplicitlyIneligible && (
                <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300">
                  Large chains and brands with 10+ locations cannot be
                  submitted.
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-text-base dark:text-text-inverted">
                  Categories <span className="text-red-500">*</span>
                </h4>
                {selectedCategories.length > 0 && (
                  <span className="rounded bg-brand-primary px-2 py-0.5 text-xs text-white">
                    {selectedCategories.length}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div data-testid="shop-category-select">
                  <Select<CategoryOption, true, GroupBase<CategoryOption>>
                    inputId="shop-categories"
                    instanceId="shop-categories"
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
                  {errors.categoryIds && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.categoryIds.message}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-xs text-brand-primary underline hover:text-brand-secondary"
                >
                  + Add New Category
                </button>
              </div>
            </div>

            <div>
              <h4 className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-text-base dark:border-gray-700 dark:text-text-inverted">
                Contact
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div>
                  <label
                    htmlFor="website_url"
                    className="mb-1.5 block text-xs font-medium text-text-base dark:text-text-inverted"
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
                    className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm text-text-base transition-colors focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary dark:border-gray-600 dark:bg-surface-dark dark:text-text-inverted"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-xs font-medium text-text-base dark:text-text-inverted"
                  >
                    Phone
                  </label>
                  <InputMask
                    id="phone"
                    mask="(___) ___-____"
                    replacement={{ _: /\d/ }}
                    placeholder="(123) 456-7890"
                    {...register("phone")}
                    className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm text-text-base transition-colors focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary dark:border-gray-600 dark:bg-surface-dark dark:text-text-inverted"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <h4 className="mb-3 text-sm font-semibold text-text-base dark:text-text-inverted">
                Submission preview
              </h4>
              <div className="space-y-2 text-sm text-text-base dark:text-text-inverted">
                <p>
                  <span className="font-medium">Shop:</span>{" "}
                  {watchedShopName || "Shop name"}
                </p>
                <p>
                  <span className="font-medium">Description:</span>{" "}
                  {watchedDescription || "Description"}
                </p>
                <p>
                  <span className="font-medium">Categories:</span>{" "}
                  {selectedCategoryLabels.length
                    ? selectedCategoryLabels.join(", ")
                    : "Select at least one category"}
                </p>
                <p>
                  <span className="font-medium">Address:</span>{" "}
                  {selectedLocationSummary || "Choose a location"}
                </p>
                {watchedWebsite ? (
                  <p>
                    <span className="font-medium">Website:</span>{" "}
                    {normalizeWebsiteUrl(String(watchedWebsite))}
                  </p>
                ) : null}
                {watchedPhone ? (
                  <p>
                    <span className="font-medium">Phone:</span> {watchedPhone}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                !canSubmit || isSubmitting
                  ? "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600"
                  : "bg-brand-primary text-white hover:bg-brand-secondary hover:text-gray-900"
              }`}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  <span>Submitting...</span>
                </>
              ) : (
                "Submit for Review"
              )}
            </button>
          </section>
        </div>

        <AddCategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSubmit={async (name, desc) => {
            try {
              const newCategory = await addCategoryIfNotExists(name, desc);
              await refreshCategories();

              if (newCategory?.id && typeof newCategory.id === "number") {
                setSelectedCategories((prev) => [...prev, newCategory.id!]);
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

  if (layoutMode === "form-section") {
    const isAdmin = userMetadata?.role === "admin";

    return (
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        data-testid="shop-form"
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
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="shop_description"
                  rows={3}
                  placeholder="Describe your shop... (minimum 20 characters)"
                  {...register("shop_description")}
                  className={`w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors resize-none ${
                    errors.shop_description
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.shop_description && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.shop_description.message}
                  </p>
                )}
                {(writerAvailable || rewriterAvailable) && (
                  <div className="mt-1.5 flex items-center gap-2">
                    {writerAvailable && (
                      <button
                        type="button"
                        disabled={
                          isGenerating ||
                          isRewriting ||
                          !watch("shopName")?.trim()
                        }
                        onClick={async () => {
                          const name = watch("shopName") ?? "";
                          const catLabels = selectedOptions.map((o) => o.label);
                          const result = await generateDescription(
                            name,
                            catLabels,
                          );
                          if (result) {
                            setValue("shop_description", result, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-gray-300 dark:border-gray-600 text-text-muted dark:text-text-inverted bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isGenerating ? (
                          <svg
                            className="animate-spin h-3 w-3"
                            viewBox="0 0 24 24"
                            fill="none"
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
                        ) : (
                          <HiSparkles className="h-3 w-3" />
                        )}
                        Generate
                      </button>
                    )}
                    {rewriterAvailable && (
                      <button
                        type="button"
                        disabled={
                          isGenerating ||
                          isRewriting ||
                          (watch("shop_description") ?? "").trim().length < 20
                        }
                        onClick={async () => {
                          const desc = watch("shop_description") ?? "";
                          const name = watch("shopName") ?? "";
                          const catLabels = selectedOptions.map((o) => o.label);
                          const result = await rewriteDescription(
                            desc,
                            name,
                            catLabels,
                          );
                          if (result) {
                            setValue("shop_description", result, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-gray-300 dark:border-gray-600 text-text-muted dark:text-text-inverted bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isRewriting ? (
                          <svg
                            className="animate-spin h-3 w-3"
                            viewBox="0 0 24 24"
                            fill="none"
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
                        ) : (
                          <HiRefresh className="h-3 w-3" />
                        )}
                        Improve
                      </button>
                    )}
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      Powered by your browser
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isEditMode && (
            <div>
              <h4 className="text-sm font-semibold text-text-base dark:text-text-inverted mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                Eligibility
              </h4>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="chain_attestation"
                    className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                  >
                    Is this shop part of a chain or franchise?
                    <span className="text-red-500"> *</span>
                  </label>
                  <select
                    id="chain_attestation"
                    {...register("chain_attestation")}
                    className={`w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors ${
                      errors.chain_attestation
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="unsure">Not sure</option>
                  </select>
                  {errors.chain_attestation && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.chain_attestation.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="estimated_location_count"
                    className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                  >
                    Do you believe this brand has 10+ locations?
                    <span className="text-red-500"> *</span>
                  </label>
                  <select
                    id="estimated_location_count"
                    {...register("estimated_location_count")}
                    className={`w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors ${
                      errors.estimated_location_count
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <option value="lt10">No</option>
                    <option value="gte10">Yes</option>
                    <option value="unsure">Not sure</option>
                  </select>
                  {errors.estimated_location_count && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.estimated_location_count.message}
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-2 text-xs text-text-base dark:text-text-inverted">
                  <input
                    type="checkbox"
                    {...register("eligibility_confirmed")}
                    className="mt-0.5 h-4 w-4 rounded border border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary"
                  />
                  <span>
                    I confirm this shop is independently owned or has fewer than
                    10 locations.
                  </span>
                </label>
                {errors.eligibility_confirmed && (
                  <p className="text-xs text-red-500">
                    {errors.eligibility_confirmed.message}
                  </p>
                )}

                {isExplicitlyIneligible && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300">
                    Chains, franchises, and brands with 10+ locations cannot be
                    submitted.
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-text-base dark:text-text-inverted">
                Categories <span className="text-red-500">*</span>
              </h4>
              {selectedCategories.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-brand-primary text-white rounded">
                  {selectedCategories.length}
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div data-testid="shop-category-select">
                <Select<CategoryOption, true, GroupBase<CategoryOption>>
                  inputId="shop-categories"
                  instanceId="shop-categories"
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
                {errors.categoryIds && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.categoryIds.message}
                  </p>
                )}
              </div>
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
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      placeholder="City"
                      {...register("city")}
                      readOnly={addressLocked}
                      className={`w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors ${
                        errors.city
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.city.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="state"
                        className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                      >
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="state"
                        {...register("state")}
                        className={`w-full text-sm px-3 py-2 border-2 rounded-md bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors ${
                          errors.state
                            ? "border-red-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        <option value="">Select...</option>
                        {US_STATES.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.code}
                          </option>
                        ))}
                      </select>
                      {errors.state && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.state.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="postcode"
                        className="block mb-1.5 text-xs font-medium text-text-base dark:text-text-inverted"
                      >
                        ZIP <span className="text-red-500">*</span>
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
              const newCategory = await addCategoryIfNotExists(name, desc);
              await refreshCategories();

              if (newCategory?.id && typeof newCategory.id === "number") {
                setSelectedCategories((prev) => [...prev, newCategory.id!]);
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
