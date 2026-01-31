import { executeQuery } from "../lib/db.js";
import { extractAuthUser } from "../lib/auth.js";

const mapRow = (row) => ({
  shopId: Number(row.shop_id ?? row.shopId),
  dateCreated: String(row.date_created ?? row.dateCreated ?? ""),
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const { userId } = await extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const rows = await executeQuery(
      `
        SELECT shop_id, date_created
        FROM saved_shops
        WHERE user_id = ?
        ORDER BY date_created DESC
      `,
      [userId],
    );

    const items = Array.isArray(rows) ? rows.map(mapRow) : [];
    res.status(200).json({
      savedShopIds: items.map((item) => item.shopId),
      items,
    });
  } catch (error) {
    console.error("Failed to load saved shops:", error);
    res.status(500).json({ message: "Failed to load saved shops" });
  }
}
