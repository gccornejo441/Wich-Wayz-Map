// src/types/shopFilter.ts

export type SortOption = "" | "recent" | "votes";
export type LocationStatusFilter =
  | "any"
  | "open"
  | "temporarily_closed"
  | "permanently_closed";
export type RecentlyAddedFilter = "any" | "7d" | "30d" | "90d";

/**
 * All optional so you can pass any subset from FilterForm / SearchBar.
 */
export interface ShopFilters {
  search?: string;

  city?: string;
  state?: string;
  country?: string;

  locationOpen?: boolean;
  locationStatus?: LocationStatusFilter;

  categoryIds?: number[];
  distanceMiles?: number | null;
  distanceAnchor?: [number, number] | null;
  savedOnly?: boolean;
  savedShopIds?: number[];
  recentlyAdded?: RecentlyAddedFilter;

  createdByUserId?: number;
  upvotedByUserId?: number;
  minUpvotes?: number;
  maxDownvotes?: number;

  membershipStatus?: string;
  verifiedOnly?: boolean;
  role?: string;

  dateCreatedRange?: {
    from: string;
    to: string;
  };

  sort?: SortOption;
}
