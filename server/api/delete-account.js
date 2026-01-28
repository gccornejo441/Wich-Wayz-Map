import { db, executeQuery } from "./lib/db.js";

const BATCH_SIZE = 450;

const deleteBatch = async (
  table,
  userIdField,
  userId,
  batchSize = BATCH_SIZE,
) => {
  let deletedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await db.execute({
      sql: `DELETE FROM ${table} WHERE ${userIdField} = ? LIMIT ?`,
      args: [userId, batchSize],
    });

    const deleted = result.rowsAffected || 0;
    deletedCount += deleted;
    hasMore = deleted === batchSize;
  }

  return deletedCount;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({
      code: "invalid-argument",
      message: "userId is required",
    });
    return;
  }

  try {
    const userRows = await executeQuery("SELECT id FROM users WHERE id = ?", [
      userId,
    ]);

    if (!userRows || userRows.length === 0) {
      res.status(404).json({
        code: "not-found",
        message: "User not found",
      });
      return;
    }

    const votesDeleted = await deleteBatch("votes", "user_id", userId);
    console.log(`Deleted ${votesDeleted} votes for user ${userId}`);

    const commentsDeleted = await deleteBatch("comments", "user_id", userId);
    console.log(`Deleted ${commentsDeleted} comments for user ${userId}`);

    const shopsRows = await executeQuery(
      "SELECT id FROM shops WHERE created_by = ?",
      [userId],
    );

    for (const shop of shopsRows) {
      await deleteBatch("votes", "shop_id", shop.id);
      await deleteBatch("comments", "shop_id", shop.id);
      await executeQuery("DELETE FROM shop_categories WHERE shop_id = ?", [
        shop.id,
      ]);
    }

    await deleteBatch("shops", "created_by", userId);
    console.log(`Deleted ${shopsRows.length} shops for user ${userId}`);

    await executeQuery("DELETE FROM users WHERE id = ?", [userId]);
    console.log(`Deleted user ${userId} from database`);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      code: "internal",
      message: "Failed to delete account",
    });
  }
}
