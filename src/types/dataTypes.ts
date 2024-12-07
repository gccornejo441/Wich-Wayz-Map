import { LatLngTuple } from "leaflet";
import { ReactNode } from "react";

export type Callback = () => void;

export interface ShopLocation {
  shop_id: number;
  location_id: number;
  date_created?: string;
  date_modified?: string;
}

export interface LocationData {
  address: string;
  address_first?: string;
  address_second?: string;
  shopName: string;
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
}

export interface ShopMarker {
  position: LatLngTuple;
  popupContent: PopupContent;
  isPopupEnabled: boolean;
  autoOpen?: boolean;
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

export interface IndexedDBShop {
  id: number;
  name: string;
  description: string;
  categories: Array<{
    id: number;
    category_name: string;
  }>;
  locations: Array<{
    id: number;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    street_address: string;
    latitude: number;
    longitude: number;
  }>;
  created_by: number;
  created_by_username: string;
  date_created: string;
  date_modified?: string;
}
