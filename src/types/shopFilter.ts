// src/types/shopFilter.ts

export type SortOption = "" | "recent" | "votes";

/**
 * All optional so you can pass any subset from FilterForm / SearchBar.
 */
export interface ShopFilters {
  search?: string;

  city?: string;
  state?: string;
  country?: string;

  locationOpen?: boolean;

  categoryIds?: number[];

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
