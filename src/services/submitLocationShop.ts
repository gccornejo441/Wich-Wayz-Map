import axios from "axios";
import { AddAShopPayload } from "@/types/dataTypes";
import { AddressDraft } from "@/types/address";
import { cacheData } from "./indexedDB";
import { ROUTES } from "../constants/routes";
import { auth } from "./firebase";
import { cleanString } from "@/utils/stringUtils";
import { Shop } from "@/models/Shop";
import { Location } from "@/models/Location";
import { GetShops } from "./shopService";
import { authApiRequest } from "./apiClient";
import { ShopGeoJsonProperties } from "@utils/shopGeoJson";
import { buildStreetAddress } from "@/utils/address";

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

    const response = await authApiRequest<{
      shopId: number;
      locationId: number;
    }>("/add-new-shop", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const fetchedShops = await GetShops();
    const fetchedLocations = fetchedShops.flatMap(
      (shop) => shop.locations || [],
    );

    setShops(fetchedShops);
    cacheData("shops", fetchedShops);

    setLocations(fetchedLocations);
    cacheData("locations", fetchedLocations);

    addToast("Location and shop submitted successfully!", "success");

    // Select the newly created shop if selectShop callback provided
    if (selectShop && response.shopId) {
      try {
        // Find the newly created shop from the already fetched shops
        const newShopData = fetchedShops.find(
          (shop) => shop.id === response.shopId,
        );

        if (newShopData && newShopData.locations?.[0]) {
          const location = newShopData.locations[0];

          // Build the shop object for sidebar display
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
        // Don't throw - shop was created successfully, just couldn't open sidebar
      }
    }

    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
      addToast("Server error: Unable to submit location and shop.", "error");
    } else {
      console.error("Unexpected error:", error);
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
 * Uses buildStreetAddress to construct the address field from street lines only.
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

  // Use AddressDraft if provided (new flow), otherwise fall back to old fields
  let addressFirst = "";
  let addressSecond = "";
  let city = "";
  let state = "";
  let postcode = "";
  let country = "";
  let latitude = 0;
  let longitude = 0;

  if (address) {
    // New structured address flow - maps to schema fields
    // streetAddress → street_address (via address_first)
    // streetAddressSecond → street_address_second (via address_second)
    addressFirst = address.streetAddress || "";
    addressSecond = address.streetAddressSecond || "";
    city = address.city || "Unknown City";
    state = address.state || "Unknown State";
    postcode = address.postalCode || "";
    country = address.country || "Unknown Country";
    latitude = address.latitude ?? 0;
    longitude = address.longitude ?? 0;
  } else {
    // Legacy fallback for old address fields
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

  // Schema-compliant payload structure
  // Maps to locations table fields (schema lines 23-40)
  const location = {
    house_number: "", // Not used with new address structure
    address_first: addressFirst, // → street_address
    address_second: addressSecond, // → street_address_second
    postcode: postcode.trim(), // → postal_code
    city: cleanedCity, // → city
    state: state.toUpperCase().trim(), // → state (keep uppercase for state codes)
    country: country.toUpperCase().trim(), // → country (keep uppercase for country codes)
    latitude, // → latitude
    longitude, // → longitude
    phone: addAShopPayload.phone || "", // → phone (optional)
    website_url: addAShopPayload.website_url || "", // → website_url (optional)
  };

  return {
    shopName: cleanedShopName,
    shop_description: cleanedDescription,
    ...location,
    selectedCategoryIds: addAShopPayload.categoryIds ?? [],
  };
}
