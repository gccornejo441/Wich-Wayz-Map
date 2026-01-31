import axios from "axios";
import { AddAShopPayload } from "@/types/dataTypes";
import { AddressDraft } from "@/types/address";
import { cacheData } from "./indexedDB";
import { getCurrentUser } from "./security";
import { ROUTES } from "../constants/routes";
import { cleanString } from "@/utils/stringUtils";
import { Shop } from "@/models/Shop";
import { Location } from "@/models/Location";
import { GetShops, fetchShopById } from "./shopService";
import { apiRequest } from "./apiClient";
import { ShopGeoJsonProperties } from "@utils/shopGeoJson";

/**
 * Handles submitting location and shop data with multiple locations.
 */
export async function handleLocationSubmit(
  addAShopPayload: AddAShopPayload,
  address: AddressDraft | undefined,
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>,
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>,
  addToast: (message: string, type: "success" | "error") => void,
  logout: () => Promise<void>,
  navigate: (path: string) => void,
  selectShop?: (shop: ShopGeoJsonProperties) => void,
): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser(logout);
    if (!currentUser) {
      navigate(ROUTES.ACCOUNT.SIGN_IN);
      return false;
    }

    if (!currentUser || currentUser.membershipStatus !== "member") {
      addToast("Only members can submit locations.", "error");
      return false;
    }

    const userId = currentUser.sub ? parseInt(currentUser.sub, 10) : undefined;
    if (userId === undefined || isNaN(userId)) {
      addToast("Invalid user ID.", "error");
      return false;
    }

    const payload = createLocationShopPayload(addAShopPayload, userId, address);

    const response = await apiRequest<{ shopId: number; locationId: number }>(
      "/add-new-shop",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    const fetchedShops = await GetShops();
    const fetchedLocations = fetchedShops.flatMap(
      (shop) => shop.locations || [],
    );

    setShops(fetchedShops);
    cacheData("shops", fetchedShops);

    setLocations(fetchedLocations);
    cacheData("locations", fetchedLocations);

    addToast("Location and shop submitted successfully!", "success");

    // Fetch and select the newly created shop if selectShop callback provided
    if (selectShop && response.shopId) {
      try {
        const newShop = await fetchShopById(response.shopId);
        selectShop(newShop);
      } catch (error) {
        console.error("Failed to fetch newly created shop:", error);
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
  modifiedBy: number | undefined,
  address?: AddressDraft,
) {
  if (modifiedBy === undefined || modifiedBy === null) {
    throw new Error("User ID (modifiedBy) is required to create a shop.");
  }

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
  const cleanedState = cleanString(state, "title");
  const cleanedCountry = cleanString(country, "title");

  // Schema-compliant payload structure
  // Maps to locations table fields (schema lines 23-40)
  const location = {
    house_number: "", // Not used with new address structure
    address_first: addressFirst, // → street_address
    address_second: addressSecond, // → street_address_second
    postcode: postcode.trim(), // → postal_code
    city: cleanedCity, // → city
    state: cleanedState, // → state
    country: cleanedCountry, // → country
    latitude, // → latitude
    longitude, // → longitude
    phone: addAShopPayload.phone || "", // → phone (optional)
    website_url: addAShopPayload.website_url || "", // → website_url (optional)
  };

  return {
    shopName: cleanedShopName,
    shop_description: cleanedDescription,
    userId: modifiedBy,
    ...location,
    selectedCategoryIds: addAShopPayload.categoryIds ?? [],
  };
}
