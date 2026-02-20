import { db } from "../lib/db.js";
import { withRole } from "../lib/withAuth.js";
import {
  normalizeBrandDisplayName,
  normalizeBrandKey,
} from "../lib/brandKey.js";

const VALID_DECISIONS = new Set(["approve", "reject"]);

const toPositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
};

const toCategoryIds = (payload) => {
  const raw = Array.isArray(payload?.selectedCategoryIds)
    ? payload.selectedCategoryIds
    : Array.isArray(payload?.categoryIds)
      ? payload.categoryIds
      : [];

  return raw
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
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
  return (
    message.includes("no such table: shop_submissions") ||
    message.includes("no such table: brands") ||
    message.includes("no such column: brand_key")
  );
};

async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const submissionId = toPositiveInt(req.query?.id);
  if (!submissionId) {
    res.status(400).json({ message: "Invalid submission id" });
    return;
  }

  const decision =
    typeof req.body?.decision === "string"
      ? req.body.decision.trim().toLowerCase()
      : "";
  if (!VALID_DECISIONS.has(decision)) {
    res.status(400).json({ message: "Invalid submission decision" });
    return;
  }

  const reviewNote =
    typeof req.body?.reviewNote === "string"
      ? req.body.reviewNote.trim().slice(0, 1000)
      : "";

  let transaction = null;

  try {
    transaction = await db.transaction();

    const submissionResult = await transaction.execute({
      sql: `
        SELECT
          id,
          status,
          brand_key,
          payload_json
        FROM shop_submissions
        WHERE id = ?
        LIMIT 1
      `,
      args: [submissionId],
    });

    const submission = submissionResult.rows?.[0];
    if (!submission) {
      await transaction.rollback();
      res.status(404).json({ message: "Submission not found" });
      return;
    }

    if (submission.status !== "pending") {
      await transaction.rollback();
      res.status(409).json({ message: "Submission has already been reviewed" });
      return;
    }

    if (decision === "reject") {
      await transaction.execute({
        sql: `
          UPDATE shop_submissions
          SET
            status = 'rejected',
            reviewed_by_user_id = ?,
            reviewed_at = CURRENT_TIMESTAMP,
            review_note = ?
          WHERE id = ?
        `,
        args: [req.dbUser.id, reviewNote || null, submissionId],
      });

      await transaction.commit();
      res.status(200).json({ id: submissionId, status: "rejected" });
      return;
    }

    const payload = tryParseJson(submission.payload_json);
    if (!payload) {
      await transaction.rollback();
      res.status(400).json({ message: "Submission payload is invalid" });
      return;
    }

    const shopName = String(payload.shopName ?? payload.name ?? "").trim();
    if (!shopName) {
      await transaction.rollback();
      res
        .status(400)
        .json({ message: "Submission payload is missing shop name" });
      return;
    }

    const brandKey = normalizeBrandKey(
      submission.brand_key || payload.brand_key || shopName,
    );

    const brandResult = await transaction.execute({
      sql: `
        SELECT status
        FROM brands
        WHERE brand_key = ?
        LIMIT 1
      `,
      args: [brandKey],
    });

    const brandStatus = String(brandResult.rows?.[0]?.status ?? "unknown");
    if (brandStatus === "blocked") {
      await transaction.rollback();
      res.status(409).json({
        message: "Cannot approve submission for a blocked brand.",
      });
      return;
    }

    const streetAddress = [payload.house_number, payload.address_first]
      .filter(Boolean)
      .join(" ")
      .trim();
    const streetAddressSecond = payload.address_second || null;

    const locationInsert = await transaction.execute({
      sql: `
        INSERT INTO locations
        (street_address, street_address_second, city, state, country, postal_code, latitude, longitude, modified_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        streetAddress,
        streetAddressSecond,
        payload.city || "",
        payload.state || "",
        payload.country || "",
        payload.postcode || "",
        payload.latitude ?? 0,
        payload.longitude ?? 0,
        req.dbUser.id,
      ],
    });

    const locationId = Number(locationInsert.lastInsertRowid);
    if (!Number.isFinite(locationId) || locationId <= 0) {
      throw new Error("Failed to determine location id from lastInsertRowid");
    }

    const shopInsert = await transaction.execute({
      sql: `
        INSERT INTO shops (name, description, created_by, modified_by, id_location, brand_key)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        shopName,
        payload.shop_description || payload.description || "",
        req.dbUser.id,
        req.dbUser.id,
        locationId,
        brandKey,
      ],
    });

    const shopId = Number(shopInsert.lastInsertRowid);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      throw new Error("Failed to determine shop id from lastInsertRowid");
    }

    await transaction.execute({
      sql: `INSERT INTO shop_locations (shop_id, location_id) VALUES (?, ?)`,
      args: [shopId, locationId],
    });

    for (const categoryId of toCategoryIds(payload)) {
      await transaction.execute({
        sql: `INSERT INTO shop_categories (shop_id, category_id) VALUES (?, ?)`,
        args: [shopId, categoryId],
      });
    }

    await transaction.execute({
      sql: `
        INSERT INTO brands (
          brand_key,
          display_name,
          status,
          updated_by_user_id
        )
        VALUES (?, ?, 'allowed', ?)
        ON CONFLICT(brand_key) DO UPDATE SET
          display_name = excluded.display_name,
          status = CASE
            WHEN brands.status = 'blocked' THEN brands.status
            ELSE 'allowed'
          END,
          updated_at = CURRENT_TIMESTAMP,
          updated_by_user_id = excluded.updated_by_user_id
      `,
      args: [brandKey, normalizeBrandDisplayName(shopName), req.dbUser.id],
    });

    await transaction.execute({
      sql: `
        UPDATE shop_submissions
        SET
          status = 'approved',
          reviewed_by_user_id = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          review_note = ?,
          approved_shop_id = ?
        WHERE id = ?
      `,
      args: [req.dbUser.id, reviewNote || null, shopId, submissionId],
    });

    await transaction.commit();

    res.status(200).json({
      id: submissionId,
      status: "approved",
      shopId,
      locationId,
      brandKey,
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Failed to rollback submission review:", rollbackError);
      }
    }

    console.error("Failed to review submission:", error);

    if (isSubmissionSchemaError(error)) {
      res.status(409).json({
        message:
          "Database not migrated for brand enforcement yet. Apply migration 010_brand_enforcement.sql.",
      });
      return;
    }

    res.status(500).json({ message: "Failed to review submission" });
  }
}

export default withRole(["admin"])(handler);
