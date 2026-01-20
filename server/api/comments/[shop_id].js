import { executeQuery } from "../lib/db.js";

export default async function getCommentsForShop(req, res) {
  const { shop_id } = req.query;

  if (typeof shop_id !== "string") {
    res.status(400).json({ message: "Invalid shop_id parameter" });
    return;
  }

  const parsedShopId = parseInt(shop_id, 10);
  if (Number.isNaN(parsedShopId)) {
    res.status(400).json({ message: "Invalid shop_id parameter" });
    return;
  }

  const query = `
    SELECT 
      c.id,
      c.shop_id,
      c.user_id,
      c.body,
      c.date_created,
      c.date_modified,
      u.username AS user_name,
      u.avatar AS user_avatar,
      u.email AS user_email
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.shop_id = ?
    ORDER BY c.date_created DESC
    LIMIT 100;
  `;

  try {
    const result = await executeQuery(query, [parsedShopId]);

    const comments =
      result?.map((row) => ({
        id: Number(row.id),
        shop_id: Number(row.shop_id),
        user_id: Number(row.user_id),
        body: row.body,
        date_created: row.date_created,
        date_modified: row.date_modified ?? null,
        user_name: row.user_name || null,
        user_avatar: row.user_avatar || null,
        user_email: row.user_email || null,
      })) ?? [];

    res.status(200).json(comments);
  } catch (err) {
    console.error("Failed to fetch comments:", err);
    res.status(500).json({
      message: "Failed to retrieve comments.",
    });
  }
}
