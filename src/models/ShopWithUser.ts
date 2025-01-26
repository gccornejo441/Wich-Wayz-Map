import { Shop } from "./Shop";
import { Location } from "./Location";
import { Category } from "@/services/categoryService";

export interface ShopWithUser extends Shop {
  created_by_username?: string;
  users_avatar_id?: string;
  locations?: Location[];
  categories?: Category[];
}
