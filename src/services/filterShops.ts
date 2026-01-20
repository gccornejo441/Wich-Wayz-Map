import { apiRequest } from "./apiClient";
import { ShopFilters } from "../types/shopFilter";

interface FilteredShop {
  id: number;
  name: string;
  description: string;
  date_created: string;
  location_open: boolean;
  city: string;
  state: string;
  country: string;
  upvotes: number;
  downvotes: number;
  categories: string[];
}

export const filterShops = async (
  filters: ShopFilters,
): Promise<FilteredShop[]> => {
  const data = await apiRequest<FilteredShop[]>("/shops/filter", {
    method: "POST",
    body: JSON.stringify(filters),
  });
  return data;
};
