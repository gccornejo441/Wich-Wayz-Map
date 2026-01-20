import { apiRequest } from "./apiClient";

export interface ShopCountResult {
  userId: number;
  email: string;
  shopCount: number;
  avatar: string;
}

/**
 * Retrieves the number of shops created by each user.
 * @returns A list of objects containing the user's ID, email, and the number of shops they created.
 */
export const getShopCountsByUser = async (): Promise<ShopCountResult[]> => {
  try {
    const result = await apiRequest<ShopCountResult[]>("/users/shop-counts");
    return result;
  } catch (error) {
    console.error("Error fetching shop counts by user:", error);
    throw error;
  }
};
