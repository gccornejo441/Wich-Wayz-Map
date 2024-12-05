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

/**
 * Handles submitting location and shop data with multiple locations.
 */
export async function handleLocationSubmit(
  addAShopPayload: AddAShopPayload,
  showToast: (message: string, type: "success" | "error") => void,
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>,
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>,
): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.membershipStatus !== "member") {
      showToast("Only members can submit locations.", "error");
      return false;
    }

    const userId = currentUser.sub ? parseInt(currentUser.sub, 10) : undefined;
    if (userId === undefined || isNaN(userId)) {
      showToast("Invalid user ID.", "error");
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

    showToast("Location and shop submitted successfully!", "success");
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
      showToast("Server error: Unable to submit location and shop.", "error");
    } else {
      console.error("Unexpected error:", error);
      showToast(
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
/**
 * Creates payload for location and shop submission.
 */
function createLocationShopPayload(
  addAShopPayload: AddAShopPayload,
  modifiedBy: number | undefined,
) {
  if (!modifiedBy) {
    throw new Error("User ID (modifiedBy) is required to create a shop.");
  }

  const currentDate = new Date().toISOString();

  const location = {
    street_address: addAShopPayload.house_number
      ? `${addAShopPayload.house_number} ${addAShopPayload.address_first}`
      : addAShopPayload.address,
    street_address_second: addAShopPayload.address_second,
    postal_code: addAShopPayload.postcode,
    city: addAShopPayload.city || "Unknown City",
    state: addAShopPayload.state || "Unknown State",
    country: addAShopPayload.country || "Unknown Country",
    latitude: addAShopPayload.latitude,
    longitude: addAShopPayload.longitude,
    modified_by: modifiedBy,
    date_created: currentDate,
    date_modified: currentDate,
  };

  const shop = {
    name: addAShopPayload.shopName,
    description: addAShopPayload.shop_description || "No description provided",
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
