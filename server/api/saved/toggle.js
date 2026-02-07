import { executeQuery } from "../lib/db.js";
import { withDbUser } from "../lib/withAuth.js";

async function toggleSavedShop(req, res) {
  const shopIdRaw = req.body?.shopId ?? req.body?.shop_id;
  const shopId = Number(shopIdRaw);

  if (!Number.isInteger(shopId) || shopId <= 0) {
    res.status(400).json({ message: "Invalid shopId" });
    return;
  }

  try {
    const existing = await executeQuery(
      `SELECT 1 FROM saved_shops WHERE user_id = ? AND shop_id = ? LIMIT 1`,
      [req.dbUser.id, shopId],
    );

    if (existing?.length) {
      await executeQuery(
        `DELETE FROM saved_shops WHERE user_id = ? AND shop_id = ?`,
        [req.dbUser.id, shopId],
      );
      res.status(200).json({ saved: false });
      return;
    }

    await executeQuery(
      `
        INSERT INTO saved_shops (user_id, shop_id)
        VALUES (?, ?)
        ON CONFLICT(user_id, shop_id) DO NOTHING
      `,
      [req.dbUser.id, shopId],
    );
    res.status(200).json({ saved: true });
  } catch (error) {
    console.error("Failed to toggle saved shop:", error);
    res.status(500).json({ message: "Failed to toggle saved shop" });
  }
}

export default withDbUser(toggleSavedShop);
