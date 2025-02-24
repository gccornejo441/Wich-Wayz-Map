import { executeQuery } from "./apiClient";

export interface ShopCountResult {
  userId: number;
  email: string;
  shopCount: number;
}

/**
 * Retrieves the number of shops created by each user.
 * @returns A list of objects containing the user's ID, email, and the number of shops they created.
 */
export const getShopCountsByUser = async (): Promise<ShopCountResult[]> => {
    
  const query = `
    SELECT 
      u.id AS userId, 
      u.email, 
      COUNT(s.id) AS shopCount
    FROM 
      users u
    LEFT JOIN 
      shops s ON u.id = s.created_by
    GROUP BY 
      u.id, u.email;
  `;

  try {
    const result = await executeQuery<ShopCountResult>(query);
    return result.rows;
  } catch (error) {
    console.error("Error fetching shop counts by user:", error);
    throw error;
  }
};
