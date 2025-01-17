import { Category } from "@/services/apiClient";
import { Shop } from "./Shop";
import { Location } from "./Location";

export interface ShopWithUser extends Shop {
    created_by_username?: string;
    users_avatar_id?: string;
    locations?: Location[];
    categories?: Category[];
  }