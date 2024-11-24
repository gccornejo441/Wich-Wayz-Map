import { LatLngTuple } from "leaflet";
import { ReactNode } from "react";

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
