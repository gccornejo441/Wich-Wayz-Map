import { AddAShopPayload } from "@/types/dataTypes";
import { AddressDraft } from "@/types/address";
import { cacheData } from "./indexedDB";
import { invalidateSearchIndex } from "./searchIndex";
import { ROUTES } from "../constants/routes";
import { auth } from "./firebase";
import { cleanString } from "@/utils/stringUtils";
import { Shop } from "@/models/Shop";
import { Location } from "@/models/Location";
import { GetShops } from "./shopService";
import { authApiRequest } from "./apiClient";
import { ShopGeoJsonProperties } from "@utils/shopGeoJson";
import { buildStreetAddress } from "@/utils/address";

type AddShopApiResponse = {
  shopId?: number;
  locationId?: number;
  status?: "pending_review";
  message?: string;
};

type ApiError = Error & {
  status?: number;
};

/**
 * Handles submitting location and shop data with multiple locations.
 */
export async function handleLocationSubmit(
  addAShopPayload: AddAShopPayload,
  address: AddressDraft | undefined,
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>,
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>,
  addToast: (message: string, type: "success" | "error") => void,
  navigate: (path: string) => void,
  selectShop?: (shop: ShopGeoJsonProperties) => void,
): Promise<boolean> {
  try {
    if (!auth.currentUser) {
      navigate(ROUTES.ACCOUNT.SIGN_IN);
      return false;
    }

    const payload = createLocationShopPayload(addAShopPayload, address);

    const response = await authApiRequest<AddShopApiResponse>("/add-new-shop", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.status === "pending_review") {
      addToast(
        response.message || "Submission received and queued for admin review.",
        "success",
      );
      return true;
    }

    const fetchedShops = await GetShops();
    const fetchedLocations = fetchedShops.flatMap(
      (shop) => shop.locations || [],
    );

    setShops(fetchedShops);
    cacheData("shops", fetchedShops);

    setLocations(fetchedLocations);
    cacheData("locations", fetchedLocations);

    // Invalidate the search index so the new shop appears in search results.
    invalidateSearchIndex();

    addToast("Location and shop submitted successfully!", "success");

    // Select the newly created shop if selectShop callback provided.
    if (selectShop && response.shopId) {
      try {
        // Find the newly created shop from the already fetched shops.
        const newShopData = fetchedShops.find(
          (shop) => shop.id === response.shopId,
        );

        if (newShopData && newShopData.locations?.[0]) {
          const location = newShopData.locations[0];

          // Build the shop object for sidebar display.
          const shopForSidebar: ShopGeoJsonProperties = {
            shopId: newShopData.id!,
            shopName: newShopData.name,
            categories:
              newShopData.categories?.map((c) => c.category_name).join(", ") ||
              "",
            categoryIds:
              newShopData.categories
                ?.map((c) => c.id)
                .filter((id): id is number => typeof id === "number") || [],
            description: newShopData.description || undefined,
            address: buildStreetAddress(
              location.street_address,
              location.street_address_second,
            ),
            city: location.city,
            state: location.state,
            postalCode: location.postal_code,
            country: location.country,
            latitude: location.latitude,
            longitude: location.longitude,
            phone: location.phone || undefined,
            website: location.website || undefined,
            website_url: location.website || undefined,
            createdBy: newShopData.created_by_username || undefined,
            created_by: newShopData.created_by,
            usersAvatarId: newShopData.users_avatar_id || undefined,
            locationStatus: location.locationStatus || "open",
            locationId: location.id,
          };

          selectShop(shopForSidebar);
        }
      } catch (error) {
        console.error("Failed to select newly created shop:", error);
        // Do not throw. Shop creation succeeded even if sidebar selection failed.
      }
    }

    return true;
  } catch (error) {
    const apiError = error as ApiError;
    console.error("Failed to submit location and shop:", error);

    if (
      apiError.status === 400 ||
      apiError.status === 409 ||
      apiError.status === 429
    ) {
      addToast(apiError.message, "error");
    } else {
      addToast(
        "An unexpected error occurred while submitting the location and shop.",
        "error",
      );
    }
    return false;
  }
}

/**
 * Creates payload for location and shop submission.
 * Uses buildStreetAddress-compatible fields for location formatting.
 */
export function createLocationShopPayload(
  addAShopPayload: AddAShopPayload,
  address?: AddressDraft,
) {
  const cleanedShopName = cleanString(addAShopPayload.shopName, "title");
  const cleanedDescription = cleanString(
    addAShopPayload.shop_description || "No description provided",
    "sentence",
  );

  // Use AddressDraft if provided (new flow), otherwise fall back to old fields.
  let addressFirst = "";
  let addressSecond = "";
  let city = "";
  let state = "";
  let postcode = "";
  let country = "";
  let latitude = 0;
  let longitude = 0;

  if (address) {
    addressFirst = address.streetAddress || "";
    addressSecond = address.streetAddressSecond || "";
    city = address.city || "Unknown City";
    state = address.state || "Unknown State";
    postcode = address.postalCode || "";
    country = address.country || "Unknown Country";
    latitude = address.latitude ?? 0;
    longitude = address.longitude ?? 0;
  } else {
    // Legacy fallback for old address fields.
    const cleanedHouseNumber = cleanString(addAShopPayload.house_number);
    const cleanedAddress = cleanString(addAShopPayload.address);
    const cleanedAddressFirst = cleanString(addAShopPayload.address_first);
    const cleanedAddressSecond = cleanString(addAShopPayload.address_second);

    const streetAddress = cleanedHouseNumber
      ? `${cleanedHouseNumber} ${cleanedAddressFirst}`
      : cleanedAddress;

    addressFirst = cleanedAddressFirst || streetAddress || "";
    addressSecond = cleanedAddressSecond || "";
    city = addAShopPayload.city || "Unknown City";
    state = addAShopPayload.state || "Unknown State";
    postcode = addAShopPayload.postcode || "";
    country = addAShopPayload.country || "Unknown Country";
    latitude = addAShopPayload.latitude ?? 0;
    longitude = addAShopPayload.longitude ?? 0;
  }

  const cleanedCity = cleanString(city, "title");

  const location = {
    house_number: "",
    address_first: addressFirst,
    address_second: addressSecond,
    postcode: postcode.trim(),
    city: cleanedCity,
    state: state.toUpperCase().trim(),
    country: country.toUpperCase().trim(),
    latitude,
    longitude,
    phone: addAShopPayload.phone || "",
    website_url: addAShopPayload.website_url || "",
    chain_attestation: addAShopPayload.chain_attestation ?? "no",
    estimated_location_count:
      addAShopPayload.estimated_location_count ?? "lt10",
    eligibility_confirmed: addAShopPayload.eligibility_confirmed ?? false,
  };

  return {
    shopName: cleanedShopName,
    shop_description: cleanedDescription,
    ...location,
    selectedCategoryIds: addAShopPayload.categoryIds ?? [],
  };
}
