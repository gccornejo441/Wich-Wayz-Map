import { db } from "./lib/db.js";

const BATCH_SIZE = 450;
const buildDeletedEmail = (userId) =>
  `deleted-user-${userId}-${Date.now()}@deleted.local`;

const ALLOWED = {
  votes: ["user_id", "shop_id"],
  comments: ["user_id", "shop_id"],
  shops: ["created_by"],
  shop_locations: ["shop_id"],
  shop_categories: ["shop_id"],
  saved_shops: ["user_id", "shop_id"],
  collections: ["user_id"],
  collection_shops: ["collection_id", "shop_id"],
};

const assertAllowed = (table, field) => {
  if (!ALLOWED[table]?.includes(field)) {
    throw new Error(`Invalid delete target: ${table}.${field}`);
  }
};

const deleteBatch = async (
  executor,
  table,
  field,
  value,
  batchSize = BATCH_SIZE,
) => {
  assertAllowed(table, field);

  let deletedCount = 0;

  while (true) {
    const result = await executor.execute({
      sql: `
        DELETE FROM ${table}
        WHERE rowid IN (
          SELECT rowid
          FROM ${table}
          WHERE ${field} = ?
          LIMIT ?
        )
      `,
      args: [value, batchSize],
    });

    const deleted = result.rowsAffected || 0;
    deletedCount += deleted;

    if (deleted === 0) break;
  }

  return deletedCount;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const userIdRaw = req.body?.userId;
  const userId = Number(userIdRaw);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({
      code: "invalid-argument",
      message: "userId is required and must be a positive integer",
    });
    return;
  }

  const tx = await db.transaction("write");

  try {
    await tx.execute({ sql: "PRAGMA foreign_keys = ON", args: [] });

    const userResult = await tx.execute({
      sql: "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      args: [userId],
    });

    if (!userResult.rows || userResult.rows.length === 0) {
      await tx.rollback();
      res.status(404).json({
        code: "not-found",
        message: "User not found",
      });
      return;
    }

    await deleteBatch(tx, "votes", "user_id", userId);

    await deleteBatch(tx, "comments", "user_id", userId);

    await deleteBatch(tx, "saved_shops", "user_id", userId);

    await tx.execute({
      sql: `
        DELETE FROM collection_shops
        WHERE collection_id IN (SELECT id FROM collections WHERE user_id = ?)
      `,
      args: [userId],
    });

    await deleteBatch(tx, "collections", "user_id", userId);

    const shopsResult = await tx.execute({
      sql: "SELECT id FROM shops WHERE created_by = ?",
      args: [userId],
    });

    const shopIds = (shopsResult.rows || []).map((r) => r.id);

    for (const shopId of shopIds) {
      await deleteBatch(tx, "votes", "shop_id", String(shopId));
      await deleteBatch(tx, "comments", "shop_id", shopId);
      await deleteBatch(tx, "saved_shops", "shop_id", shopId);

      await deleteBatch(tx, "shop_locations", "shop_id", shopId);
      await deleteBatch(tx, "shop_categories", "shop_id", shopId);

      await deleteBatch(tx, "collection_shops", "shop_id", shopId);
    }

    await deleteBatch(tx, "shops", "created_by", userId);

    await tx.execute({
      sql: `
        UPDATE users
        SET
          email = ?,
          first_name = NULL,
          last_name = NULL,
          avatar = NULL,
          verification_token = NULL,
          token_expiry = NULL,
          reset_token = NULL,
          verified = 0,
          hashed_password = ?,
          membership_status = 'deleted',
          account_status = 'deleted',
          deleted_at = CURRENT_TIMESTAMP,
          date_modified = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
      `,
      args: [
        buildDeletedEmail(userId),
        `deleted-account-${userId}-${Date.now()}`,
        userId,
      ],
    });

    await tx.commit();
    res.status(200).json({ ok: true });
  } catch (error) {
    try {
      await tx.rollback();
    } catch {}

    console.error("Error deleting account:", error);
    res.status(500).json({
      code: "internal",
      message: "Failed to delete account",
    });
  }
}
