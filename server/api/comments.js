import { withActiveAccount } from "./lib/withAuth.js";
import { executeQuery } from "./lib/db.js";

async function createComment(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const { shop_id, body } = req.body ?? {};
  const parsedShopId = parseInt(shop_id, 10);
  const parsedUserId = req.dbUser.id;
  const trimmedBody =
    typeof body === "string" ? body.trim().slice(0, 5000) : "";

  if (Number.isNaN(parsedShopId) || trimmedBody.length === 0) {
    res.status(400).json({ message: "shop_id and body are required" });
    return;
  }

  const insertQuery = `
    INSERT INTO comments (shop_id, user_id, body)
    VALUES (?, ?, ?)
    RETURNING id, shop_id, user_id, body, date_created, date_modified;
  `;

  try {
    const result = await executeQuery(insertQuery, [
      parsedShopId,
      parsedUserId,
      trimmedBody,
    ]);

    const created = result?.[0];

    if (!created) {
      res.status(500).json({ message: "Failed to add comment." });
      return;
    }

    const userDetails = await executeQuery(
      `
        SELECT username AS user_name, avatar AS user_avatar, email AS user_email
        FROM users
        WHERE id = ?
        LIMIT 1;
      `,
      [parsedUserId],
    );

    const userRow = userDetails?.[0] || {};

    res.status(201).json({
      id: Number(created.id),
      shop_id: Number(created.shop_id),
      user_id: Number(created.user_id),
      body: created.body,
      date_created: created.date_created,
      date_modified: created.date_modified ?? null,
      user_name: userRow.user_name || null,
      user_avatar: userRow.user_avatar || null,
      user_email: userRow.user_email || null,
    });
  } catch (err) {
    console.error("Failed to insert comment:", err);
    res.status(500).json({ message: "Failed to add comment." });
  }
}

export default withActiveAccount(createComment);
