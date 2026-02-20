import { withActiveAccount } from "./lib/withAuth.js";
import { db } from "./lib/db.js";
import {
  normalizeBrandDisplayName,
  normalizeBrandKey,
} from "./lib/brandKey.js";
import { scoreChainLikelihood } from "./lib/chainScore.js";

const VALID_CHAIN_ATTESTATIONS = new Set(["no", "yes", "unsure"]);
const VALID_LOCATION_COUNT_OPTIONS = new Set(["lt10", "gte10", "unsure"]);
const VALID_ENFORCEMENT_MODES = new Set(["off", "shadow", "enforce"]);

const DEFAULT_SUBMISSIONS_PER_HOUR = 3;
const DEFAULT_SUBMISSIONS_PER_DAY = 12;

const toSafeCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
};

const toSafeLimit = (rawValue, fallback) => {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
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

const toEnumValue = (value, validValues, fallback) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return validValues.has(normalized) ? normalized : fallback;
};

const getChainEnforcementMode = () => {
  const raw = String(process.env.CHAIN_ENFORCEMENT_MODE ?? "enforce")
    .trim()
    .toLowerCase();

  if (!VALID_ENFORCEMENT_MODES.has(raw)) {
    return "enforce";
  }

  return raw;
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error("[add-new-shop] Failed to stringify JSON payload:", error);
    return "{}";
  }
};

const isBrandSchemaError = (error) => {
  const message = String(error?.message ?? "");
  return (
    message.includes("no such table: brands") ||
    message.includes("no such table: shop_submissions") ||
    message.includes("no such column: brand_key")
  );
};

const checkSubmissionRateLimits = async (userId) => {
  const maxPerHour = toSafeLimit(
    process.env.ADD_SHOP_MAX_PER_HOUR,
    DEFAULT_SUBMISSIONS_PER_HOUR,
  );
  const maxPerDay = toSafeLimit(
    process.env.ADD_SHOP_MAX_PER_DAY,
    DEFAULT_SUBMISSIONS_PER_DAY,
  );

  let stats = {};

  try {
    const result = await db.execute({
      sql: `
        SELECT
          COALESCE((
            SELECT COUNT(*)
            FROM shops
            WHERE created_by = ?
              AND date_created >= datetime('now', '-1 hour')
          ), 0) AS shops_last_hour,
          COALESCE((
            SELECT COUNT(*)
            FROM shops
            WHERE created_by = ?
              AND date_created >= datetime('now', '-1 day')
          ), 0) AS shops_last_day,
          COALESCE((
            SELECT COUNT(*)
            FROM shop_submissions
            WHERE submitted_by_user_id = ?
              AND submitted_at >= datetime('now', '-1 hour')
          ), 0) AS pending_last_hour,
          COALESCE((
            SELECT COUNT(*)
            FROM shop_submissions
            WHERE submitted_by_user_id = ?
              AND submitted_at >= datetime('now', '-1 day')
          ), 0) AS pending_last_day
      `,
      args: [userId, userId, userId, userId],
    });

    stats = result.rows?.[0] ?? {};
  } catch (error) {
    const message = String(error?.message ?? "");
    if (!message.includes("no such table: shop_submissions")) {
      throw error;
    }

    const fallback = await db.execute({
      sql: `
        SELECT
          COALESCE((
            SELECT COUNT(*)
            FROM shops
            WHERE created_by = ?
              AND date_created >= datetime('now', '-1 hour')
          ), 0) AS shops_last_hour,
          COALESCE((
            SELECT COUNT(*)
            FROM shops
            WHERE created_by = ?
              AND date_created >= datetime('now', '-1 day')
          ), 0) AS shops_last_day
      `,
      args: [userId, userId],
    });

    stats = {
      ...(fallback.rows?.[0] ?? {}),
      pending_last_hour: 0,
      pending_last_day: 0,
    };
  }

  const perHourTotal =
    toSafeCount(stats.shops_last_hour) + toSafeCount(stats.pending_last_hour);
  const perDayTotal =
    toSafeCount(stats.shops_last_day) + toSafeCount(stats.pending_last_day);

  if (perHourTotal >= maxPerHour) {
    return {
      limited: true,
      message: `Submission limit reached (${maxPerHour}/hour). Please try again later.`,
    };
  }

  if (perDayTotal >= maxPerDay) {
    return {
      limited: true,
      message: `Submission limit reached (${maxPerDay}/day). Please try again tomorrow.`,
    };
  }

  return { limited: false };
};

const upsertBrandTelemetry = async ({
  brandKey,
  shopName,
  userId,
  score,
  signals,
  knownLocationCount,
  statusHint = null,
}) => {
  await db.execute({
    sql: `
      INSERT INTO brands (
        brand_key,
        display_name,
        status,
        known_location_count,
        last_chain_score,
        last_signals_json,
        updated_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(brand_key) DO UPDATE SET
        display_name = excluded.display_name,
        status = CASE
          WHEN excluded.status IS NULL OR excluded.status = 'unknown'
            THEN brands.status
          ELSE excluded.status
        END,
        known_location_count = COALESCE(
          excluded.known_location_count,
          brands.known_location_count
        ),
        last_chain_score = COALESCE(excluded.last_chain_score, brands.last_chain_score),
        last_signals_json = COALESCE(excluded.last_signals_json, brands.last_signals_json),
        updated_at = CURRENT_TIMESTAMP,
        updated_by_user_id = COALESCE(excluded.updated_by_user_id, brands.updated_by_user_id)
    `,
    args: [
      brandKey,
      normalizeBrandDisplayName(shopName),
      statusHint,
      knownLocationCount,
      score,
      safeJsonStringify(signals),
      userId,
    ],
  });
};

const queueSubmissionForReview = async ({
  userId,
  brandKey,
  score,
  signals,
  payload,
}) => {
  await db.execute({
    sql: `
      INSERT INTO shop_submissions (
        submitted_by_user_id,
        status,
        brand_key,
        chain_score,
        signals_json,
        payload_json
      )
      VALUES (?, 'pending', ?, ?, ?, ?)
    `,
    args: [
      userId,
      brandKey,
      score,
      safeJsonStringify(signals),
      safeJsonStringify(payload),
    ],
  });
};

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let step = "init";

  // Harden request body parsing
  let body;
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body);
    } catch (parseErr) {
      console.error("[add-new-shop] Failed to parse body string:", parseErr);
      return res.status(400).json({ error: "Invalid JSON in request body" });
    }
  } else if (req.body === null || req.body === undefined) {
    body = {};
  } else {
    body = req.body;
  }

  console.error("[add-new-shop] Received request body:", JSON.stringify(body));

  const {
    shopName,
    shop_description,
    website_url,
    house_number,
    address_first,
    address_second,
    city,
    state,
    postcode,
    country,
    latitude,
    longitude,
    chain_attestation,
    estimated_location_count,
    eligibility_confirmed,
    selectedCategoryIds = [],
  } = body;

  if (!String(shopName ?? "").trim()) {
    return res.status(400).json({ error: "Shop name is required" });
  }

  if (!Array.isArray(selectedCategoryIds)) {
    return res
      .status(400)
      .json({ error: "selectedCategoryIds must be an array" });
  }

  const userId = req.dbUser.id;
  const chainEnforcementMode = getChainEnforcementMode();
  const shouldUseBrandEnforcement = chainEnforcementMode !== "off";

  const chainAttestation = toEnumValue(
    chain_attestation,
    VALID_CHAIN_ATTESTATIONS,
    "unsure",
  );
  const estimatedLocationCount = toEnumValue(
    estimated_location_count,
    VALID_LOCATION_COUNT_OPTIONS,
    "unsure",
  );
  const eligibilityConfirmed = toBoolean(eligibility_confirmed);

  if (chainEnforcementMode === "enforce" && !eligibilityConfirmed) {
    return res.status(400).json({
      error:
        "Eligibility confirmation is required. Chains/franchises/10+ location brands are not allowed.",
    });
  }

  // Build street_address from house_number + address_first ONLY
  // Do NOT include city, state, or postal_code in street_address
  const streetAddress = [house_number, address_first]
    .filter(Boolean)
    .join(" ")
    .trim();
  const streetAddressSecond = address_second || null;

  console.error("[add-new-shop] Prepared data:", {
    streetAddress,
    streetAddressSecond,
    userId,
  });

  let locationId;
  let shopId;
  let transaction = null;
  let brandKey = "";

  try {
    const rateLimit = await checkSubmissionRateLimits(userId);
    if (rateLimit.limited) {
      return res.status(429).json({ error: rateLimit.message });
    }
    brandKey = normalizeBrandKey(shopName);
    if (!brandKey) {
      return res.status(400).json({ error: "Unable to determine a brand key" });
    }

    if (shouldUseBrandEnforcement) {
      const knownBrandResult = await db.execute({
        sql: `
          SELECT
            brand_key,
            status,
            known_location_count
          FROM brands
          WHERE brand_key = ?
          LIMIT 1
        `,
        args: [brandKey],
      });

      const knownBrand = knownBrandResult.rows?.[0] ?? null;
      const knownBrandStatus = String(knownBrand?.status ?? "unknown");
      const knownBrandLocationCount = toSafeCount(
        knownBrand?.known_location_count,
      );

      if (
        chainEnforcementMode === "enforce" &&
        knownBrandStatus === "blocked"
      ) {
        return res.status(409).json({
          error:
            "This brand is blocked because chains/franchises/10+ locations are not allowed.",
          reasons: ["brand_already_blocked"],
        });
      }

      const internalCountResult = await db.execute({
        sql: `
          SELECT COUNT(*) AS total
          FROM shops
          WHERE brand_key = ?
            AND COALESCE(content_status, 'active') = 'active'
        `,
        args: [brandKey],
      });

      const internalCount = toSafeCount(internalCountResult.rows?.[0]?.total);

      const chainScore = scoreChainLikelihood({
        shopName,
        websiteUrl: website_url,
        internalCount,
        chainAttestation,
        estimatedLocationCount,
        knownBrandStatus,
        knownLocationCount: knownBrandLocationCount,
      });

      const chainSignals = {
        decision: chainScore.decision,
        reasons: chainScore.reasons,
        internalCount,
        knownBrandStatus,
        knownBrandLocationCount,
        chainAttestation,
        estimatedLocationCount,
        websiteUrl: website_url || null,
        enforcementMode: chainEnforcementMode,
      };

      if (
        chainEnforcementMode === "enforce" &&
        chainScore.decision === "block"
      ) {
        await upsertBrandTelemetry({
          brandKey,
          shopName,
          userId,
          score: chainScore.score,
          signals: chainSignals,
          knownLocationCount: Math.max(internalCount, knownBrandLocationCount),
          statusHint: "blocked",
        });

        return res.status(409).json({
          error: "Chains/franchises/10+ location brands are not allowed.",
          reasons: chainScore.reasons,
          score: chainScore.score,
        });
      }

      if (
        chainEnforcementMode === "enforce" &&
        chainScore.decision === "review"
      ) {
        await upsertBrandTelemetry({
          brandKey,
          shopName,
          userId,
          score: chainScore.score,
          signals: chainSignals,
          knownLocationCount: Math.max(internalCount, knownBrandLocationCount),
          statusHint: "needs_review",
        });

        await queueSubmissionForReview({
          userId,
          brandKey,
          score: chainScore.score,
          signals: chainSignals,
          payload: body,
        });

        return res.status(202).json({
          status: "pending_review",
          message: "Submission queued for admin review.",
        });
      }

      await upsertBrandTelemetry({
        brandKey,
        shopName,
        userId,
        score: chainScore.score,
        signals: chainSignals,
        knownLocationCount: Math.max(internalCount, knownBrandLocationCount),
        statusHint: chainScore.decision === "review" ? "needs_review" : null,
      });
    }

    transaction = await db.transaction();

    // Step 1: Insert location
    step = "insert_location";
    console.error(
      "[add-new-shop] Step: insert_location - Inserting location...",
    );
    const locationInsert = await transaction.execute({
      sql: `
        INSERT INTO locations
        (street_address, street_address_second, city, state, country, postal_code, latitude, longitude, modified_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        streetAddress,
        streetAddressSecond,
        city,
        state,
        country,
        postcode,
        latitude,
        longitude,
        userId,
      ],
    });
    console.error("[add-new-shop] Location inserted successfully");

    // Get location ID from INSERT result
    locationId = Number(locationInsert.lastInsertRowid);
    if (!Number.isFinite(locationId) || locationId <= 0) {
      throw new Error("Failed to determine location id from lastInsertRowid");
    }
    console.error("[add-new-shop] Location ID:", locationId);

    // Step 2: Insert shop
    step = "insert_shop";
    console.error(
      "[add-new-shop] Step: insert_shop - Inserting shop with modified_by as userId:",
      userId,
    );
    const shopInsert = shouldUseBrandEnforcement
      ? await transaction.execute({
          sql: `
            INSERT INTO shops (name, description, created_by, modified_by, id_location, brand_key)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          args: [
            shopName,
            shop_description,
            userId,
            userId,
            locationId,
            brandKey,
          ],
        })
      : await transaction.execute({
          sql: `
            INSERT INTO shops (name, description, created_by, modified_by, id_location)
            VALUES (?, ?, ?, ?, ?)
          `,
          args: [shopName, shop_description, userId, userId, locationId],
        });
    console.error("[add-new-shop] Shop inserted successfully");

    // Get shop ID from INSERT result
    shopId = Number(shopInsert.lastInsertRowid);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      throw new Error("Failed to determine shop id from lastInsertRowid");
    }
    console.error("[add-new-shop] Shop ID:", shopId);

    // Step 3: Insert shop_location relationship
    step = "insert_shop_locations";
    console.error(
      "[add-new-shop] Step: insert_shop_locations - Inserting shop_location relationship...",
    );
    await transaction.execute({
      sql: `INSERT INTO shop_locations (shop_id, location_id) VALUES (?, ?)`,
      args: [shopId, locationId],
    });
    console.error("[add-new-shop] Shop location relationship inserted");

    // Step 4: Insert categories
    step = "insert_shop_categories";
    console.error(
      "[add-new-shop] Step: insert_shop_categories - Inserting categories (count:",
      selectedCategoryIds?.length,
      ")...",
    );
    for (const catId of selectedCategoryIds) {
      const safeCategoryId = Number(catId);
      if (!Number.isFinite(safeCategoryId) || safeCategoryId <= 0) {
        continue;
      }

      console.error("[add-new-shop] Inserting category:", catId);
      await transaction.execute({
        sql: `INSERT INTO shop_categories (shop_id, category_id) VALUES (?, ?)`,
        args: [shopId, safeCategoryId],
      });
    }
    console.error("[add-new-shop] All categories inserted");
    await transaction.commit();

    console.error("[add-new-shop] All operations completed successfully");
    res.status(200).json({ shopId, locationId });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error(
          "[add-new-shop] Failed to rollback transaction:",
          rollbackError,
        );
      }
    }

    if (isBrandSchemaError(err)) {
      return res.status(409).json({
        error:
          "Database not migrated for brand enforcement yet. Apply migration 010_brand_enforcement.sql.",
      });
    }

    console.error(
      "[add-new-shop] CRITICAL ERROR - Operation failed at step:",
      step,
    );
    console.error("[add-new-shop] Error name:", err.name);
    console.error("[add-new-shop] Error message:", err.message);
    console.error("[add-new-shop] Error stack:", err.stack);
    console.error(
      "[add-new-shop] Full error object:",
      JSON.stringify(err, Object.getOwnPropertyNames(err)),
    );

    // Attempt cleanup if we have IDs
    if (shopId) {
      console.error("[add-new-shop] Attempting to cleanup shop_id:", shopId);
      try {
        await db.execute({
          sql: `DELETE FROM shop_categories WHERE shop_id = ?`,
          args: [shopId],
        });
        await db.execute({
          sql: `DELETE FROM shop_locations WHERE shop_id = ?`,
          args: [shopId],
        });
        await db.execute({
          sql: `DELETE FROM shops WHERE id = ?`,
          args: [shopId],
        });
        console.error("[add-new-shop] Shop cleanup successful");
      } catch (cleanupErr) {
        console.error("[add-new-shop] Cleanup failed:", cleanupErr);
      }
    }

    if (locationId) {
      console.error(
        "[add-new-shop] Attempting to cleanup location_id:",
        locationId,
      );
      try {
        await db.execute({
          sql: `DELETE FROM locations WHERE id = ?`,
          args: [locationId],
        });
        console.error("[add-new-shop] Location cleanup successful");
      } catch (cleanupErr) {
        console.error("[add-new-shop] Location cleanup failed:", cleanupErr);
      }
    }

    res.status(500).json({
      error: "Failed to submit shop",
      details: err.message,
      step,
    });
  }
}

export default withActiveAccount(handler);
