import { executeQuery } from "../lib/db.js";
import { withRole } from "../lib/withAuth.js";

const VALID_SUBMISSION_STATUSES = new Set(["pending", "approved", "rejected"]);

const toSafeLimit = (value, fallback = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), 500);
};

const tryParseJson = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error("Failed to parse submission JSON payload:", error);
    return null;
  }
};

const isSubmissionSchemaError = (error) => {
  const message = String(error?.message ?? "");
  return message.includes("no such table: shop_submissions");
};

async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const requestedStatus =
    typeof req.query?.status === "string"
      ? req.query.status.trim().toLowerCase()
      : "pending";
  const statusFilter = requestedStatus || "pending";

  if (!VALID_SUBMISSION_STATUSES.has(statusFilter)) {
    res.status(400).json({ message: "Invalid submission status filter" });
    return;
  }

  const limit = toSafeLimit(req.query?.limit, 100);

  try {
    const rows = await executeQuery(
      `
        SELECT
          ss.id,
          ss.submitted_by_user_id,
          u.email AS submitted_by_email,
          ss.submitted_at,
          ss.status,
          ss.brand_key,
          ss.chain_score,
          ss.signals_json,
          ss.payload_json,
          ss.reviewed_by_user_id,
          ru.email AS reviewed_by_email,
          ss.reviewed_at,
          ss.review_note,
          ss.approved_shop_id
        FROM shop_submissions ss
        LEFT JOIN users u ON u.id = ss.submitted_by_user_id
        LEFT JOIN users ru ON ru.id = ss.reviewed_by_user_id
        WHERE ss.status = ?
        ORDER BY ss.submitted_at DESC
        LIMIT ?;
      `,
      [statusFilter, limit],
    );

    const items = rows.map((row) => ({
      id: Number(row.id),
      submittedByUserId: Number(row.submitted_by_user_id),
      submittedByEmail: row.submitted_by_email || null,
      submittedAt: row.submitted_at,
      status: row.status,
      brandKey: row.brand_key || null,
      chainScore: Number(row.chain_score ?? 0),
      signals: tryParseJson(row.signals_json),
      payload: tryParseJson(row.payload_json),
      reviewedByUserId:
        row.reviewed_by_user_id === null
          ? null
          : Number(row.reviewed_by_user_id),
      reviewedByEmail: row.reviewed_by_email || null,
      reviewedAt: row.reviewed_at || null,
      reviewNote: row.review_note || null,
      approvedShopId:
        row.approved_shop_id === null ? null : Number(row.approved_shop_id),
    }));

    res.status(200).json({ items });
  } catch (error) {
    console.error("Failed to list shop submissions:", error);

    if (isSubmissionSchemaError(error)) {
      res.status(409).json({
        message:
          "Database not migrated for brand enforcement yet. Apply migration 010_brand_enforcement.sql.",
      });
      return;
    }

    res.status(500).json({ message: "Failed to list shop submissions" });
  }
}

export default withRole(["admin"])(handler);
