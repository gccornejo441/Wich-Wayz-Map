import axios from "axios";
import { AddAShopPayload } from "../types/dataTypes";
import { cacheData } from "./indexedDB";
import { getCurrentUser } from "./security";
import { ROUTES } from "../constants/routes";
import { cleanString } from "@/utils/stringUtils";
import { Shop } from "@/models/Shop";
import { Location } from "@/models/Location";
import { GetShops } from "./shopService";
import { submitLocationWithShop } from "./shopLocation";

/**
 * Handles submitting location and shop data with multiple locations.
 */
export async function handleLocationSubmit(
  addAShopPayload: AddAShopPayload,
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>,
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>,
  addToast: (message: string, type: "success" | "error") => void,
  logout: () => Promise<void>,
  navigate: (path: string) => void,
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

    const payload = createLocationShopPayload(addAShopPayload, userId);

    const { location, shop } = await submitLocationWithShop(payload);

    if (!location || !shop) {
      throw new Error("Invalid response from server. Missing processed data.");
    }

    const fetchedShops = await GetShops();
    const fetchedLocations = fetchedShops.flatMap(
      (shop) => shop.locations || [],
    );

    setShops(fetchedShops);
    cacheData("shops", fetchedShops);

    setLocations(fetchedLocations);
    cacheData("locations", fetchedLocations);

    addToast("Location and shop submitted successfully!", "success");
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
 */
export function createLocationShopPayload(
  addAShopPayload: AddAShopPayload,
  modifiedBy: number | undefined,
) {
  if (modifiedBy === undefined || modifiedBy === null) {
    throw new Error("User ID (modifiedBy) is required to create a shop.");
  }

  const currentDate = new Date().toISOString();

  const cleanedShopName = cleanString(addAShopPayload.shopName, "title");
  const cleanedDescription = cleanString(
    addAShopPayload.shop_description || "No description provided",
    "sentence",
  );

  const cleanedHouseNumber = cleanString(addAShopPayload.house_number);
  const cleanedAddress = cleanString(addAShopPayload.address);
  const cleanedAddressFirst = cleanString(addAShopPayload.address_first);
  const cleanedAddressSecond = cleanString(addAShopPayload.address_second);

  const cleanedCity = cleanString(
    addAShopPayload.city || "Unknown City",
    "title",
  );
  const cleanedState = cleanString(
    addAShopPayload.state || "Unknown State",
    "title",
  );
  const cleanedCountry = cleanString(
    addAShopPayload.country || "Unknown Country",
    "title",
  );

  const streetAddress = cleanedHouseNumber
    ? `${cleanedHouseNumber} ${cleanedAddressFirst}`
    : cleanedAddress;

  const location = {
    street_address: streetAddress,
    street_address_second: cleanedAddressSecond,
    postal_code: addAShopPayload.postcode?.trim() || "",
    city: cleanedCity,
    state: cleanedState,
    country: cleanedCountry,
    latitude: addAShopPayload.latitude,
    longitude: addAShopPayload.longitude,
    modified_by: modifiedBy,
    date_created: currentDate,
    date_modified: currentDate,
  };

  const shop = {
    name: cleanedShopName,
    description: cleanedDescription,
    modified_by: modifiedBy,
    created_by: modifiedBy,
  };

  return { location, shop, categoryIds: addAShopPayload.categoryIds };
}
