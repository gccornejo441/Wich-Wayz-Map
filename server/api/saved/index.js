import { executeQuery } from "../lib/db.js";
import { withDbUser } from "../lib/withAuth.js";

const mapRow = (row) => ({
  shopId: Number(row.shop_id ?? row.shopId),
  dateCreated: String(row.date_created ?? row.dateCreated ?? ""),
});

async function getSavedShops(req, res) {
  try {
    const rows = await executeQuery(
      `
        SELECT shop_id, date_created
        FROM saved_shops
        WHERE user_id = ?
        ORDER BY date_created DESC
      `,
      [req.dbUser.id],
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

export default withDbUser(getSavedShops);
