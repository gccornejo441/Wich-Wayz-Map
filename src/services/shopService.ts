import { ShopWithUser } from "@/models/ShopWithUser";
import { apiRequest } from "./apiClient";

/**
 * Retrieves all shops from the database, including their associated users, locations, and categories.
 *
 * @returns {Promise<ShopWithUser[]>} A list of shops with their related information.
 * @throws An error if the fetch fails.
 */
export const GetShops = async (): Promise<ShopWithUser[]> => {
  try {
    const shops = await apiRequest<ShopWithUser[]>("/shops");
    return shops;
  } catch (error) {
    console.error("Error fetching shops:", error);
    throw new Error("Failed to fetch shops.");
  }
};
