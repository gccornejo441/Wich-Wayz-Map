import { apiRequest } from "./apiClient";
import {
  Collection,
  CollectionVisibility,
  CollectionWithShops,
} from "@models/Collection";
import { ShopWithUser } from "@models/ShopWithUser";
import { Category } from "@models/Category";
import { Location } from "@models/Location";

const normalizeVisibility = (value: unknown): CollectionVisibility => {
  if (value === "public" || value === "unlisted") return value;
  return "private";
};

const parseShopIds = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.map((id) => Number(id)).filter((id) => Number.isInteger(id));
  }

  if (typeof value === "string" && value.trim().length) {
    return value
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isInteger(id));
  }

  return [];
};

const mapCollection = (raw: Record<string, unknown>): Collection => {
  const shopIds = parseShopIds(
    (raw.shopIds as unknown) ??
      (raw.shop_ids as unknown) ??
      (raw.shopIdsString as unknown),
  );

  const shopCount =
    typeof raw.shopCount === "number"
      ? raw.shopCount
      : typeof raw.shop_count === "number"
        ? Number(raw.shop_count)
        : shopIds.length || undefined;

  return {
    id: Number(raw.id),
    userId: Number(raw.userId ?? raw.user_id),
    name: String(raw.name ?? ""),
    description:
      raw.description === null
        ? null
        : typeof raw.description === "string"
          ? raw.description
          : undefined,
    visibility: normalizeVisibility(raw.visibility),
    dateCreated:
      (raw.dateCreated as string | undefined) ??
      (raw.date_created as string | undefined) ??
      null,
    dateModified:
      (raw.dateModified as string | undefined) ??
      (raw.date_modified as string | undefined) ??
      null,
    shopCount,
    shopIds,
  };
};

const mapCategory = (raw: Record<string, unknown>): Category => ({
  id: Number(raw.id ?? raw.category_id),
  category_name: String(raw.category_name ?? raw.name ?? "Unknown"),
});

const mapLocation = (raw: Record<string, unknown>): Location => ({
  id: raw.id ? Number(raw.id) : Number(raw.location_id),
  postal_code: String(raw.postal_code ?? raw.postalCode ?? ""),
  latitude: Number(raw.latitude ?? 0),
  longitude: Number(raw.longitude ?? 0),
  modified_by:
    raw.modified_by === null || raw.modified_by === undefined
      ? undefined
      : Number(raw.modified_by),
  date_created:
    (raw.date_created as string | undefined) ??
    (raw.dateCreated as string | undefined),
  date_modified:
    (raw.date_modified as string | undefined) ??
    (raw.dateModified as string | undefined),
  street_address: String(raw.street_address ?? raw.streetAddress ?? ""),
  street_address_second:
    (raw.street_address_second as string | undefined) ??
    (raw.streetAddressSecond as string | undefined) ??
    undefined,
  city: String(raw.city ?? ""),
  state: String(raw.state ?? ""),
  country: String(raw.country ?? ""),
  locationStatus:
    (raw.locationStatus as Location["locationStatus"]) ??
    (raw.location_status as Location["locationStatus"]) ??
    "open",
  phone:
    (raw.phone as string | null | undefined) ??
    (raw.phone_number as string | null | undefined) ??
    null,
  website:
    (raw.website as string | null | undefined) ??
    (raw.website_url as string | null | undefined) ??
    null,
  website_url:
    (raw.website_url as string | null | undefined) ??
    (raw.websiteUrl as string | null | undefined) ??
    null,
});

const mapShop = (raw: Record<string, unknown>): ShopWithUser => ({
  id: Number(raw.id ?? raw.shop_id),
  name: String(raw.name ?? raw.shop_name ?? ""),
  description:
    (raw.description as string | null | undefined) ??
    (raw.shop_description as string | null | undefined) ??
    null,
  created_by: Number(raw.created_by ?? raw.createdBy ?? 0),
  modified_by:
    raw.modified_by === undefined || raw.modified_by === null
      ? null
      : Number(raw.modified_by),
  date_created:
    (raw.date_created as string | undefined) ??
    (raw.dateCreated as string | undefined) ??
    undefined,
  date_modified:
    (raw.date_modified as string | null | undefined) ??
    (raw.dateModified as string | null | undefined) ??
    null,
  id_location:
    raw.id_location !== undefined
      ? Number(raw.id_location)
      : raw.locationId !== undefined
        ? Number(raw.locationId)
        : undefined,
  created_by_username:
    (raw.created_by_username as string | undefined) ??
    (raw.createdByUsername as string | undefined),
  users_avatar_id:
    (raw.users_avatar_id as string | undefined) ??
    (raw.usersAvatarId as string | undefined),
  users_avatar_email:
    (raw.users_avatar_email as string | undefined) ??
    (raw.usersAvatarEmail as string | undefined),
  locations: Array.isArray(raw.locations)
    ? (raw.locations as Record<string, unknown>[]).map(mapLocation)
    : [],
  categories: Array.isArray(raw.categories)
    ? (raw.categories as Record<string, unknown>[]).map(mapCategory)
    : [],
});

export const createCollection = async (
  payload: {
    name: string;
    description?: string;
    visibility?: CollectionVisibility;
  },
  userId?: number,
): Promise<Collection> => {
  try {
    const data = await apiRequest<Record<string, unknown>>("/collections", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        userId,
        user_id: userId,
      }),
    });
    return mapCollection(data);
  } catch (error) {
    console.error("Failed to create collection:", error);
    throw new Error("Could not create collection");
  }
};

export const getMyCollections = async (
  userId?: number,
): Promise<Collection[]> => {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  try {
    const data = await apiRequest<Record<string, unknown>[]>(
      `/collections${query}`,
    );
    return data.map((item) => mapCollection(item));
  } catch (error) {
    console.error("Failed to load collections:", error);
    throw new Error("Could not load collections");
  }
};

export const updateCollection = async (
  id: number,
  payload: Partial<{
    name: string;
    description: string | null;
    visibility: CollectionVisibility;
  }>,
  userId?: number,
): Promise<Collection> => {
  try {
    const data = await apiRequest<Record<string, unknown>>(
      `/collections/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ...payload,
          userId,
          user_id: userId,
        }),
      },
    );
    return mapCollection(data);
  } catch (error) {
    console.error("Failed to update collection:", error);
    throw new Error("Could not update collection");
  }
};

export const deleteCollection = async (
  id: number,
  userId?: number,
): Promise<void> => {
  try {
    await apiRequest(`/collections/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ userId, user_id: userId }),
    });
  } catch (error) {
    console.error("Failed to delete collection:", error);
    throw new Error("Could not delete collection");
  }
};

export const addShopToCollection = async (
  id: number,
  shopId: number,
  userId?: number,
): Promise<boolean> => {
  try {
    const result = await apiRequest<{ added?: boolean }>(
      `/collections/${id}/shops`,
      {
        method: "POST",
        body: JSON.stringify({ shopId, userId, user_id: userId }),
      },
    );
    return Boolean(result.added);
  } catch (error) {
    console.error("Failed to add shop to collection:", error);
    throw new Error("Could not add shop to collection");
  }
};

export const removeShopFromCollection = async (
  id: number,
  shopId: number,
  userId?: number,
): Promise<boolean> => {
  try {
    const result = await apiRequest<{ removed?: boolean }>(
      `/collections/${id}/shops/${shopId}`,
      {
        method: "DELETE",
        body: JSON.stringify({ userId, user_id: userId }),
      },
    );
    return Boolean(result?.removed ?? true);
  } catch (error) {
    console.error("Failed to remove shop from collection:", error);
    throw new Error("Could not remove shop from collection");
  }
};

export const getPublicCollection = async (
  id: number,
): Promise<CollectionWithShops> => {
  try {
    const data = await apiRequest<Record<string, unknown>>(
      `/collections/public/${id}`,
    );

    const shopsRaw = (data.shops as Record<string, unknown>[]) ?? [];
    const shops = shopsRaw.map(mapShop);

    return {
      ...mapCollection(data),
      shops,
      shopIds: shops.map((s) => s.id ?? 0).filter((id) => Number.isInteger(id)),
      shopCount: shops.length,
    };
  } catch (error) {
    console.error("Failed to load public collection:", error);
    throw new Error("Could not load collection");
  }
};
