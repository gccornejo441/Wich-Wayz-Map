import { executeQuery } from "./apiClient";
import { ShopFilters } from "../types/shopFilter";

interface FilteredShop {
  id: number;
  name: string;
  description: string;
  date_created: string;
  location_open: boolean;
  city: string;
  state: string;
  country: string;
  upvotes: number;
  downvotes: number;
  categories: string[];
}

export const filterShops = async (
  filters: ShopFilters
): Promise<FilteredShop[]> => {
  const where: string[] = [];
  const args: (string | number)[] = [];

  let joinVotes = false;
  let joinCategories = false;

  if (filters.country) {
    where.push("locations.country = ?");
    args.push(filters.country);
  }
  if (filters.state) {
    where.push("locations.state = ?");
    args.push(filters.state);
  }
  if (filters.city) {
    where.push("locations.city = ?");
    args.push(filters.city);
  }
  if (filters.locationOpen !== undefined) {
    where.push("locations.location_open = ?");
    args.push(filters.locationOpen ? 1 : 0);
  }
  if (filters.createdByUserId) {
    where.push("shops.created_by = ?");
    args.push(filters.createdByUserId);
  }
  if (filters.membershipStatus) {
    where.push("users.membership_status = ?");
    args.push(filters.membershipStatus);
  }
  if (filters.verifiedOnly) {
    where.push("users.verified = 1");
  }
  if (filters.role) {
    where.push("users.role = ?");
    args.push(filters.role);
  }
  if (filters.dateCreatedRange) {
    where.push("shops.date_created BETWEEN ? AND ?");
    args.push(filters.dateCreatedRange.from, filters.dateCreatedRange.to);
  }
  if (filters.upvotedByUserId) {
    joinVotes = true;
    where.push("votes.user_id = ? AND votes.upvote = 1");
    args.push(filters.upvotedByUserId);
  }
  if (filters.minUpvotes !== undefined || filters.maxDownvotes !== undefined) {
    joinVotes = true;
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    joinCategories = true;
    const placeholders = filters.categoryIds.map(() => "?").join(", ");
    where.push(`shop_categories.category_id IN (${placeholders})`);
    args.push(...filters.categoryIds);
  }

  const joins = [
    "JOIN locations ON shops.id_location = locations.id",
    "JOIN users ON shops.created_by = users.id",
    joinVotes ? "LEFT JOIN votes ON shops.id = votes.shop_id" : "",
    joinCategories ? "LEFT JOIN shop_categories ON shops.id = shop_categories.shop_id" : "",
  ];

  const groupBy = "GROUP BY shops.id";
  const having: string[] = [];

  if (filters.minUpvotes !== undefined) {
    having.push("SUM(CASE WHEN votes.upvote = 1 THEN 1 ELSE 0 END) >= ?");
    args.push(filters.minUpvotes);
  }
  if (filters.maxDownvotes !== undefined) {
    having.push("SUM(CASE WHEN votes.downvote = 1 THEN 1 ELSE 0 END) <= ?");
    args.push(filters.maxDownvotes);
  }

  const sql = `
    SELECT
      shops.*,
      locations.city,
      locations.state,
      locations.country,
      locations.location_open,
      COALESCE(SUM(CASE WHEN votes.upvote = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
      COALESCE(SUM(CASE WHEN votes.downvote = 1 THEN 1 ELSE 0 END), 0) AS downvotes
    FROM shops
    ${joins.filter(Boolean).join(" ")}
    ${where.length > 0 ? "WHERE " + where.join(" AND ") : ""}
    ${groupBy}
    ${having.length > 0 ? "HAVING " + having.join(" AND ") : ""}
    ORDER BY shops.date_created DESC
  `;

  const { rows } = await executeQuery<FilteredShop>(sql, args);
  return rows;
};
