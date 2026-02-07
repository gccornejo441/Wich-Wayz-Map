import { executeQuery } from "../../../lib/db.js";
import { withDbUser } from "../../../lib/withAuth.js";

const parseId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const collectionId = parseId(req.query.id);
  const shopId = parseId(req.query.shopId);

  if (!collectionId || !shopId) {
    res.status(400).json({ message: "Invalid collection or shop id" });
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
    if (owner[0].user_id !== req.dbUser.id) {
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

    if (!existing?.length) {
      res.status(404).json({ message: "Shop not in collection" });
      return;
    }

    await executeQuery(
      `DELETE FROM collection_shops WHERE collection_id = ? AND shop_id = ?`,
      [collectionId, shopId],
    );

    await executeQuery(
      `UPDATE collections SET date_modified = CURRENT_TIMESTAMP WHERE id = ?`,
      [collectionId],
    );

    res.status(200).json({ removed: true });
  } catch (error) {
    console.error("Failed to remove shop from collection:", error);
    res.status(500).json({ message: "Failed to remove shop from collection" });
  }
}

export default withDbUser(handler);
