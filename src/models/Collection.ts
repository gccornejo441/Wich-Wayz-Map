export type CollectionVisibility = "private" | "unlisted" | "public";

export interface Collection {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  visibility: CollectionVisibility;
  dateCreated?: string | null;
  dateModified?: string | null;
  shopCount?: number;
  shopIds?: number[];
}

export interface CollectionWithShops extends Collection {
  shops: import("./ShopWithUser").ShopWithUser[];
}
