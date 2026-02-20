import { db } from "../lib/db.js";
import { withRole } from "../lib/withAuth.js";
import {
  normalizeBrandDisplayName,
  normalizeBrandKey,
} from "../lib/brandKey.js";

const VALID_BRAND_STATUSES = new Set([
  "unknown",
  "allowed",
  "blocked",
  "needs_review",
]);

const isBrandSchemaError = (error) => {
  const message = String(error?.message ?? "");
  return (
    message.includes("no such table: brands") ||
    message.includes("no such table: brand_actions") ||
    message.includes("no such column: brand_key")
  );
};

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
};

const mapActionFromStatus = (status) => {
  if (status === "blocked") return "block";
  if (status === "allowed") return "set_allowed";
  if (status === "needs_review") return "set_review";
  return "unblock";
};

async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const rawBrandKey =
    typeof req.query?.brand_key === "string" ? req.query.brand_key : "";
  const decodedBrandKey = decodeURIComponent(rawBrandKey).trim();
  const brandKey = normalizeBrandKey(decodedBrandKey);

  if (!brandKey) {
    res.status(400).json({ message: "Invalid brand key" });
    return;
  }

  const requestedStatus =
    typeof req.body?.status === "string"
      ? req.body.status.trim().toLowerCase()
      : "";

  if (!VALID_BRAND_STATUSES.has(requestedStatus)) {
    res.status(400).json({ message: "Invalid brand status" });
    return;
  }

  const applyRetroactive = toBoolean(req.body?.applyRetroactive ?? true);
  const reason =
    typeof req.body?.reason === "string"
      ? req.body.reason.trim().slice(0, 500)
      : "";

  const userId = req.dbUser.id;
  const action = mapActionFromStatus(requestedStatus);
  let transaction = null;

  try {
    transaction = await db.transaction();

    await transaction.execute({
      sql: `
        INSERT INTO brands (
          brand_key,
          display_name,
          status,
          updated_by_user_id
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(brand_key) DO UPDATE SET
          status = excluded.status,
          updated_at = CURRENT_TIMESTAMP,
          updated_by_user_id = excluded.updated_by_user_id
      `,
      args: [
        brandKey,
        normalizeBrandDisplayName(decodedBrandKey || brandKey),
        requestedStatus,
        userId,
      ],
    });

    await transaction.execute({
      sql: `
        INSERT INTO brand_actions (
          brand_key,
          action,
          reason,
          payload_json,
          actor_user_id
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        brandKey,
        action,
        reason || null,
        JSON.stringify({
          status: requestedStatus,
          applyRetroactive,
        }),
        userId,
      ],
    });

    let affectedShops = 0;

    if (applyRetroactive && requestedStatus === "blocked") {
      const result = await transaction.execute({
        sql: `
          UPDATE shops
          SET
            content_status = 'hidden',
            hidden_source = 'brand',
            hidden_reason = ?,
            hidden_at = CURRENT_TIMESTAMP,
            hidden_by_user_id = ?
          WHERE brand_key = ?
            AND COALESCE(content_status, 'active') = 'active'
        `,
        args: [reason || "Brand blocked by admin", userId, brandKey],
      });
      affectedShops = Number(result.rowsAffected ?? 0);
    }

    if (applyRetroactive && requestedStatus === "allowed") {
      const result = await transaction.execute({
        sql: `
          UPDATE shops
          SET
            content_status = 'active',
            hidden_source = NULL,
            hidden_reason = NULL,
            hidden_at = NULL,
            hidden_by_user_id = NULL
          WHERE brand_key = ?
            AND hidden_source = 'brand'
            AND COALESCE(content_status, 'active') = 'hidden'
        `,
        args: [brandKey],
      });
      affectedShops = Number(result.rowsAffected ?? 0);
    }

    await transaction.commit();

    res.status(200).json({
      brandKey,
      status: requestedStatus,
      affectedShops,
      applyRetroactive,
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Failed to rollback brand status update:", rollbackError);
      }
    }

    console.error("Failed to update brand status:", error);

    if (isBrandSchemaError(error)) {
      res.status(409).json({
        message:
          "Database not migrated for brand enforcement yet. Apply migration 010_brand_enforcement.sql.",
      });
      return;
    }

    res.status(500).json({ message: "Failed to update brand status" });
  }
}

export default withRole(["admin"])(handler);
