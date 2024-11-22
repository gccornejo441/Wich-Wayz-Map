import { LatLngTuple } from "leaflet";
import { ReactNode } from "react";

export interface Vote {
  shop_id: number;
  user_id: number;
  upvote: boolean;
  downvote: boolean;
}

// export interface Shop {
//   id?: number;
//   name: string;
//   description?: string;
//   modified_by?: number;
//   created_by?: number;
//   date_created?: string;
//   date_modified?: string;
//   location_ids: number[];
// }

// export interface Location {
//   id?: number;
//   postal_code: string;
//   latitude: number;
//   longitude: number;
//   modified_by?: number;
//   date_created?: string;
//   date_modified?: string;
//   street_address: string;
//   city?: string;
//   state?: string;
//   country?: string;
// }

export interface ShopLocation {
  shop_id: number;
  location_id: number;
  date_created?: string;
  date_modified?: string;
}

export interface LocationData {
  address: string;
  shopName: string;
  house_number?: string;
  road?: string;
  city?: string;
  state?: string;
  postcode: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface AddAShopPayload extends LocationData {
  shop_description: string;
}

export interface VoteContextData {
  votes: Record<
    number,
    { upvotes: number; downvotes: number; userVote: "up" | "down" | null }
  >;
  addVote: (shopId: number, isUpvote: boolean) => void;
  getVotesForShop: (shopId: number) => Promise<void>;
  submitVote: (shopId: number, isUpvote: boolean) => Promise<void>;
}

export interface GravatarProps {
  email: string;
  size?: number;
  rating?: "g" | "pg" | "r" | "x";
  defaultImage?:
    | "404"
    | "mp"
    | "identicon"
    | "monsterid"
    | "wavatar"
    | "retro"
    | "robohash"
    | "blank";
  alt?: string;
}

export interface CroppedArea {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface AvatarOption {
  id: string;
  src: string;
}

export type SvgModule = {
  default: React.FC<React.SVGProps<SVGSVGElement>>;
};

export interface AccountProps {
  email: string;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  handleUpdateProfile: () => void;
}

export interface AvatarUploaderProps {
  avatarId: string | undefined;
  setAvatarId: (avatarId: string) => void;
  userEmail: string;
}

export interface GravatarAvatarProps extends Omit<GravatarProps, "size"> {
  alt?: string;
  bordered?: boolean;
  color?: "gray" | "red" | "yellow" | "green" | "blue" | "purple" | "pink";
  rounded?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  stacked?: boolean;
  status?: "away" | "busy" | "offline" | "online";
  statusPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  placeholderInitials?: string;
}

export interface UserAvatarProps {
  avatarId: string;
  userEmail: string;
  size?: "sm" | "md" | "lg";
}

export interface PopupContent {
  shopId: number;
  shopName: string;
  address: string;
  description?: string;
  createdBy: string;
  usersAvatarId?: string;
  usersAvatarEmail?: string;
}

export interface ShopMarker {
  position: LatLngTuple;
  popupContent: PopupContent;
  isPopupEnabled: boolean;
}

export interface ToastMessageProps {
  toastMessage: string;
  toastType: "success" | "error";
  position?: string;
}

export interface WarningDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ShopsProviderProps {
  children: ReactNode;
}
