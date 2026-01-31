import { apiRequest } from "./apiClient";

export type SavedShopItem = {
  shopId: number;
  dateCreated?: string | null;
};

const mapSavedItem = (raw: Record<string, unknown>): SavedShopItem => ({
  shopId: Number(raw.shopId ?? raw.shop_id),
  dateCreated:
    typeof raw.dateCreated === "string"
      ? raw.dateCreated
      : typeof raw.date_created === "string"
        ? raw.date_created
        : null,
});

export const toggleSavedShop = async (
  shopId: number,
  userId?: number,
): Promise<boolean> => {
  try {
    const response = await apiRequest<{ saved: boolean }>("/saved/toggle", {
      method: "POST",
      body: JSON.stringify({
        shopId,
        userId,
        user_id: userId,
      }),
    });
    return response.saved;
  } catch (error) {
    console.error("Failed to toggle saved shop:", error);
    throw new Error("Could not update saved shop");
  }
};

export const getSavedShopIds = async (
  userId?: number,
): Promise<SavedShopItem[]> => {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  try {
    const response = await apiRequest<{
      savedShopIds?: number[];
      items?: Record<string, unknown>[];
    }>(`/saved${query}`);

    if (Array.isArray(response.items)) {
      return response.items.map((item) => mapSavedItem(item));
    }

    if (Array.isArray(response.savedShopIds)) {
      return response.savedShopIds.map((id) => ({
        shopId: Number(id),
        dateCreated: null,
      }));
    }

    return [];
  } catch (error) {
    console.error("Failed to load saved shops:", error);
    throw new Error("Could not load saved shops");
  }
};
