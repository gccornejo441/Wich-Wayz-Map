import { executeQuery } from "../../lib/db.js";
import { extractAuthUser } from "../../lib/auth.js";

const parseId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const collectionId = parseId(req.query.id);
  if (!collectionId) {
    res.status(400).json({ message: "Invalid collection id" });
    return;
  }

  const { userId } = await extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const shopId = parseId(req.body?.shopId ?? req.body?.shop_id);
  if (!shopId) {
    res.status(400).json({ message: "Invalid shopId" });
    return;
  }

  try {
    const owner = await executeQuery(
      `SELECT user_id FROM collections WHERE id = ? LIMIT 1`,
      [collectionId],
    );
    if (!owner?.length) {
      res.status(404).json({ message: "Collection not found" });
      return;
    }
    if (owner[0].user_id !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const existing = await executeQuery(
      `
        SELECT 1
        FROM collection_shops
        WHERE collection_id = ? AND shop_id = ?
        LIMIT 1
      `,
      [collectionId, shopId],
    );

    if (existing?.length) {
      res.status(200).json({ added: false });
      return;
    }

    const nextOrderRows = await executeQuery(
      `
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
        FROM collection_shops
        WHERE collection_id = ?
      `,
      [collectionId],
    );
    const nextOrder = Number(nextOrderRows?.[0]?.next_order ?? 1);

    await executeQuery(
      `
        INSERT INTO collection_shops (collection_id, shop_id, sort_order)
        VALUES (?, ?, ?)
      `,
      [collectionId, shopId, nextOrder],
    );

    await executeQuery(
      `UPDATE collections SET date_modified = CURRENT_TIMESTAMP WHERE id = ?`,
      [collectionId],
    );

    res.status(200).json({ added: true, sortOrder: nextOrder });
  } catch (error) {
    console.error("Failed to add shop to collection:", error);
    res.status(500).json({ message: "Failed to add shop to collection" });
  }
}
