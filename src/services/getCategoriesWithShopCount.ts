import { apiRequest } from "./apiClient";

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
  const rows = await apiRequest<CategoryWithShopCount[]>(
    "/categories/with-count",
  );
  return rows;
};
