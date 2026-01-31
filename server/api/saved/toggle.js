import { executeQuery } from "../lib/db.js";
import { extractAuthUser } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const { userId } = await extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const shopIdRaw = req.body?.shopId ?? req.body?.shop_id;
  const shopId = Number(shopIdRaw);

  if (!Number.isInteger(shopId) || shopId <= 0) {
    res.status(400).json({ message: "Invalid shopId" });
    return;
  }

  try {
    const existing = await executeQuery(
      `SELECT 1 FROM saved_shops WHERE user_id = ? AND shop_id = ? LIMIT 1`,
      [userId, shopId],
    );

    if (existing?.length) {
      await executeQuery(
        `DELETE FROM saved_shops WHERE user_id = ? AND shop_id = ?`,
        [userId, shopId],
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
      [userId, shopId],
    );
    res.status(200).json({ saved: true });
  } catch (error) {
    console.error("Failed to toggle saved shop:", error);
    res.status(500).json({ message: "Failed to toggle saved shop" });
  }
}
