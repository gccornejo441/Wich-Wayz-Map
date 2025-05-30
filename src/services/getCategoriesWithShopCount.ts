import { executeQuery } from "./apiClient";

export interface CategoryWithShopCount {
  id: number;
  name: string;
  shopCount: number;
}

/**
 * Fetches the categories with the count of shops in each category.
 * @returns A list of categories with the count of shops in each category, ordered by shop count in descending order.
 */
export const getCategoriesWithShopCount = async (): Promise<
  CategoryWithShopCount[]
> => {
  const query = `
    SELECT 
      c.id,
      c.category_name AS name,
      COUNT(sc.shop_id) AS shopCount
    FROM categories c
    LEFT JOIN shop_categories sc ON c.id = sc.category_id
    GROUP BY c.id
    ORDER BY shopCount DESC;
  `;

  const { rows } = await executeQuery<CategoryWithShopCount>(query);
  return rows;
};
