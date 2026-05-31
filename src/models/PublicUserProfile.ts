import { Collection } from "@models/Collection";

export interface PublicUserFavoriteShop {
  id: number;
  name: string;
}

export interface PublicUserProfile {
  id: number;
  username: string;
  avatar: string | null;
  avatarHash: string | null;
  bio: string | null;
  favoriteSandwich: string | null;
  favoriteShop: PublicUserFavoriteShop | null;
  dateCreated: string | null;
  shopCount: number;
  commentCount: number;
  publicCollections: Collection[];
}
