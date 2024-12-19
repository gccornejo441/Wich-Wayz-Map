import axios from "axios";
import { AddAShopPayload } from "../types/dataTypes";
import {
  Shop,
  submitLocationWithShop,
  Location,
  GetShops,
} from "./shopLocation";
import { cacheData, getCachedData } from "./indexedDB";
import { getCurrentUser } from "./security";
import { updateData } from "./apiClient";
import { useShops } from "../context/shopContext";
import { ROUTES } from "../constants/routes";

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
 * Updates local state and caches locations.
 */
export function updateLocations(
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>,
  insertedLocations: Location[],
): void {
  setLocations((prevLocations) => {
    const updatedLocations = [...prevLocations, ...insertedLocations];
    cacheData("locations", updatedLocations);
    return updatedLocations;
  });
}

/**
 * Updates local state and caches shops.
 */
export function updateShops(
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>,
  newShop: Shop,
): void {
  setShops((prevShops) => {
    const updatedShops = [...prevShops, newShop];
    cacheData("shops", updatedShops);
    return updatedShops;
  });
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanString(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  return toTitleCase(trimmed);
}

/**
 * Creates payload for location and shop submission.
 */
function createLocationShopPayload(
  addAShopPayload: AddAShopPayload,
  modifiedBy: number | undefined,
) {
  if (modifiedBy === undefined || modifiedBy === null) {
    throw new Error("User ID (modifiedBy) is required to create a shop.");
  }

  const currentDate = new Date().toISOString();

  const cleanedShopName = cleanString(addAShopPayload.shopName);
  const cleanedDescription = cleanString(
    addAShopPayload.shop_description || "No description provided",
  );

  const cleanedHouseNumber = cleanString(addAShopPayload.house_number);
  const cleanedAddress = cleanString(addAShopPayload.address);
  const cleanedAddressFirst = cleanString(addAShopPayload.address_first);
  const cleanedAddressSecond = cleanString(addAShopPayload.address_second);

  const cleanedCity = cleanString(addAShopPayload.city || "Unknown City");
  const cleanedState = cleanString(addAShopPayload.state || "Unknown State");
  const cleanedCountry = cleanString(
    addAShopPayload.country || "Unknown Country",
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

/**
 * Updates a shop's basic information in the database.
 */
export const updateShopInfo = async (
  shopId: number,
  updates: Record<string, string | number | null>,
): Promise<void> => {
  await updateData("shops", updates, "id = ?", [shopId]);
};

export const useUpdateShopCategories = () => {
  const { setShops } = useShops();

  const SaveUpdatedShopCategories = async (
    shopId: number,
    updatedCategories: { id: number; category_name: string }[],
  ): Promise<void> => {
    try {
      const cachedShops = await getCachedData("shops");

      const shopIndex = cachedShops.findIndex((shop) => shop.id === shopId);
      if (shopIndex === -1) {
        console.error(`Shop with ID ${shopId} not found in cache.`);
        return;
      }

      const updatedShop = { ...cachedShops[shopIndex] };
      updatedShop.categories = updatedCategories;

      cachedShops[shopIndex] = updatedShop;

      await cacheData("shops", cachedShops);

      setShops([...cachedShops]);
    } catch (error) {
      console.error("Failed to update shop categories in IndexedDB:", error);
      throw error;
    }
  };

  return { SaveUpdatedShopCategories };
};
