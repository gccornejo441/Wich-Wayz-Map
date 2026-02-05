import { ReactNode } from "react";

export type Callback = () => void | Promise<void>;
export type LocationStatus =
  | "open"
  | "temporarily_closed"
  | "permanently_closed";
export type ShopWithId = AddAShopPayload & { shopId: string | number };

export interface ShopLocation {
  shop_id: number;
  location_id: number;
  date_created?: string;
  date_modified?: string;
}

export interface LocationData {
  shopName: string;
  address?: string;
  website_url?: string;
  phone?: string;
  address_first?: string;
  address_second?: string;
  house_number?: string;
  city?: string;
  state?: string;
  postcode: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface AddAShopPayload extends LocationData {
  shop_description: string;
  categoryIds: number[];
}

export interface UpdateShopPayload {
  name: string;
  address?: string;
  address_first?: string;
  address_second?: string;
  house_number?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  categoryIds?: number[];
}

export interface PopupContent {
  shopId: number;
  shopName: string;
  address: string;
  description?: string;
  createdBy: string;
  categories?: string;
  usersAvatarId?: string;
  usersAvatarEmail?: string;
  latitude: number;
  longitude: number;
  locationStatus?: "open" | "temporarily_closed" | "permanently_closed";
}

export interface ToastMessageProps {
  toastMessage: string;
  toastType: "success" | "error";
  position?: string;
}

export interface WarningDialogProps {
  isOpen: boolean;
  onConfirm: Callback;
  onCancel: Callback;
  isProcessing?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ShopsProviderProps {
  children: ReactNode;
}

export interface Vote {
  shop_id: number;
  user_id: number;
  upvote: number;
  downvote: number;
}

export interface VoteResponse {
  shop_id: number;
  upvotes: number;
  downvotes: number;
}

export interface VoteContextData {
  votes: Record<
    number,
    {
      upvotes: number;
      downvotes: number;
      userVote: "up" | "down" | null;
    }
  >;
  addVote: (shopId: number, isUpvote: boolean) => "up" | "down" | null;
  getVotesForShop: (shopId: number) => Promise<void>;
  submitVote: (
    shopId: number,
    nextUserVote: "up" | "down" | null,
  ) => Promise<void>;
  loadingVotes: boolean;
}

/**
 * Extended Shop type that includes all possible field name variations
 * from database queries and transformations
 */
export type ShopDataVariants = {
  // Image fields
  image_url?: string;
  imageUrl?: string;

  // Description fields
  shop_description?: string;
  description?: string;

  // User/Creator fields
  usersAvatarEmail?: string;
  users_avatar_email?: string;
  user_email?: string;
  usersAvatarId?: string;
  users_avatar_id?: string;
  user_avatar_id?: string;
  createdBy?: string;
  created_by?: string | number;
  created_by_username?: string;

  // Voting
  votes?: number;

  // Categories
  categoryIds?: number[];
  category_ids?: number[];

  // Contact
  phone?: string;

  // Website fields
  website?: string;
  website_url?: string;
  websiteUrl?: string;
};

/**
 * Extended Location type that includes all possible field name variations
 */
export type LocationDataVariants = {
  // Address fields
  address?: string;
  street_address?: string;
  street_address_second?: string;

  // Location details
  city?: string;
  state?: string;
  postalCode?: string;
  postal_code?: string;
  country?: string;

  // Contact
  website?: string;
  phone?: string;
};

export interface AddCommentPayload {
  shopId: number;
  userId: number;
  body: string;
}

export interface CommentResponse {
  id: number;
  shopId: number;
  userId: number;
  body: string;
  dateCreated: string;
  dateModified?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  userEmail?: string | null;
}
