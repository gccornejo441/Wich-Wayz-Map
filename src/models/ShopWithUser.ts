import { Shop } from "./Shop";
import { Location } from "./Location";
import { Category } from "@models/Category";

export interface ShopWithUser extends Shop {
  created_by_username?: string;
  users_avatar_id?: string;
  users_avatar_email?: string;
  locations?: Location[];
  categories?: Category[];
}
