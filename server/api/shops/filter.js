import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const filters = req.body || {};

  const where = ["COALESCE(shops.content_status, 'active') = 'active'"];
  const joinArgs = [];
  const whereArgs = [];
  const havingArgs = [];

  if (filters.country) {
    where.push("locations.country = ?");
    whereArgs.push(filters.country);
  }
  if (filters.state) {
    where.push("locations.state = ?");
    whereArgs.push(filters.state);
  }
  if (filters.city) {
    where.push("locations.city = ?");
    whereArgs.push(filters.city);
  }
  if (filters.locationOpen !== undefined) {
    where.push("locations.location_open = ?");
    whereArgs.push(filters.locationOpen ? 1 : 0);
  }
  if (filters.createdByUserId) {
    where.push("shops.created_by = ?");
    whereArgs.push(filters.createdByUserId);
  }
  if (filters.membershipStatus) {
    where.push("users.membership_status = ?");
    whereArgs.push(filters.membershipStatus);
  }
  if (filters.verifiedOnly) {
    where.push("users.verified = 1");
  }
  if (filters.role) {
    where.push("users.role = ?");
    whereArgs.push(filters.role);
  }
  if (filters.dateCreatedRange?.from && filters.dateCreatedRange?.to) {
    where.push("shops.date_created BETWEEN ? AND ?");
    whereArgs.push(filters.dateCreatedRange.from, filters.dateCreatedRange.to);
  }

  const joins = [
    "LEFT JOIN vote_totals vt ON shops.id = vt.shop_id",
    "JOIN locations ON shops.id_location = locations.id",
    "JOIN users ON shops.created_by = users.id",
    "LEFT JOIN shop_categories sc ON shops.id = sc.shop_id",
    "LEFT JOIN categories c ON sc.category_id = c.id",
  ];

  if (filters.upvotedByUserId) {
    joins.push(
      "INNER JOIN votes uv ON shops.id = uv.shop_id AND uv.user_id = ? AND uv.upvote = 1",
    );
    joinArgs.push(filters.upvotedByUserId);
  }

  const having = [];

  if (filters.minUpvotes !== undefined) {
    having.push("COALESCE(vt.upvotes, 0) >= ?");
    havingArgs.push(filters.minUpvotes);
  }
  if (filters.maxDownvotes !== undefined) {
    having.push("COALESCE(vt.downvotes, 0) <= ?");
    havingArgs.push(filters.maxDownvotes);
  }

  if (filters.categoryIds?.length) {
    const placeholders = filters.categoryIds.map(() => "?").join(", ");
    where.push(`sc.category_id IN (${placeholders})`);
    whereArgs.push(...filters.categoryIds);
  }

  let orderBy = "ORDER BY shops.date_created DESC";
  if (filters.sort === "votes") {
    orderBy = "ORDER BY COALESCE(vt.upvotes, 0) DESC";
  }

  const withClause = `
    WITH vote_totals AS (
      SELECT 
        shop_id,
        SUM(CASE WHEN upvote = 1 THEN 1 ELSE 0 END) AS upvotes,
        SUM(CASE WHEN downvote = 1 THEN 1 ELSE 0 END) AS downvotes
      FROM votes
      GROUP BY shop_id
    )
  `;

  const sql = `
    ${withClause}
    SELECT
      shops.id,
      shops.name,
      shops.description,
      shops.date_created,
      locations.location_open,
      locations.city,
      locations.state,
      locations.country,
      COALESCE(vt.upvotes, 0) AS upvotes,
      COALESCE(vt.downvotes, 0) AS downvotes,
      GROUP_CONCAT(DISTINCT c.category_name) AS category_names
    FROM shops
    ${joins.join(" ")}
    WHERE ${where.length ? where.join(" AND ") : "1=1"}
    GROUP BY shops.id
    ${having.length ? `HAVING ${having.join(" AND ")}` : ""}
    ${orderBy}
  `;

  try {
    const rows = await executeQuery(sql, [
      ...joinArgs,
      ...whereArgs,
      ...havingArgs,
    ]);
    const response = rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      description: row.description,
      date_created: row.date_created,
      location_open:
        row.location_open === 1 ||
        row.location_open === true ||
        String(row.location_open).toLowerCase() === "1" ||
        String(row.location_open).toLowerCase() === "true",
      city: row.city,
      state: row.state,
      country: row.country,
      upvotes: Number(row.upvotes) || 0,
      downvotes: Number(row.downvotes) || 0,
      categories: row.category_names
        ? String(row.category_names).split(",").filter(Boolean)
        : [],
    }));
    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to filter shops:", error);
    res.status(500).json({ message: "Failed to filter shops" });
  }
}
