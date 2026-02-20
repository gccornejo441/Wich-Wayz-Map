import { executeQuery } from "../lib/db.js";
import { withRole } from "../lib/withAuth.js";

const VALID_BRAND_STATUSES = new Set([
  "unknown",
  "allowed",
  "blocked",
  "needs_review",
]);

const toSafeLimit = (value, fallback = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), 500);
};

const isBrandSchemaError = (error) => {
  const message = String(error?.message ?? "");
  return (
    message.includes("no such table: brands") ||
    message.includes("no such column: brand_key")
  );
};

async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const requestedStatus =
    typeof req.query?.status === "string" ? req.query.status.trim() : "";
  const statusFilter = requestedStatus.toLowerCase();
  const search =
    typeof req.query?.search === "string" ? req.query.search.trim() : "";
  const limit = toSafeLimit(req.query?.limit, 100);

  const where = [];
  const args = [];

  if (statusFilter) {
    if (!VALID_BRAND_STATUSES.has(statusFilter)) {
      res.status(400).json({ message: "Invalid brand status filter" });
      return;
    }
    where.push("b.status = ?");
    args.push(statusFilter);
  }

  if (search) {
    where.push(
      "(LOWER(b.brand_key) LIKE LOWER(?) OR LOWER(b.display_name) LIKE LOWER(?))",
    );
    args.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const rows = await executeQuery(
      `
        SELECT
          b.brand_key,
          b.display_name,
          b.status,
          b.known_location_count,
          b.last_chain_score,
          b.last_signals_json,
          b.updated_at,
          b.updated_by_user_id,
          SUM(
            CASE
              WHEN COALESCE(s.content_status, 'active') = 'active' THEN 1
              ELSE 0
            END
          ) AS active_shop_count
        FROM brands b
        LEFT JOIN shops s
          ON s.brand_key = b.brand_key
        ${whereClause}
        GROUP BY b.brand_key
        ORDER BY
          CASE b.status
            WHEN 'blocked' THEN 0
            WHEN 'needs_review' THEN 1
            WHEN 'unknown' THEN 2
            ELSE 3
          END,
          b.updated_at DESC
        LIMIT ?;
      `,
      [...args, limit],
    );

    const items = rows.map((row) => ({
      brandKey: row.brand_key,
      displayName: row.display_name,
      status: row.status,
      knownLocationCount:
        row.known_location_count === null
          ? null
          : Number(row.known_location_count),
      lastChainScore:
        row.last_chain_score === null ? null : Number(row.last_chain_score),
      lastSignalsJson: row.last_signals_json || null,
      updatedAt: row.updated_at,
      updatedByUserId:
        row.updated_by_user_id === null ? null : Number(row.updated_by_user_id),
      activeShopCount: Number(row.active_shop_count ?? 0),
    }));

    res.status(200).json({ items });
  } catch (error) {
    console.error("Failed to list brands:", error);

    if (isBrandSchemaError(error)) {
      res.status(409).json({
        message:
          "Database not migrated for brand enforcement yet. Apply migration 010_brand_enforcement.sql.",
      });
      return;
    }

    res.status(500).json({ message: "Failed to list brands" });
  }
}

export default withRole(["admin"])(handler);
