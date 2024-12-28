import { createClient } from "@libsql/client/web";

const TURSO_URL = process.env.TURSO_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
  throw new Error(
    "Environment variables TURSO_API_KEY and TURSO_DATABASE_URL must be set"
  );
}

export const tursoClient = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

export default async function getVotesForShop(req, res) {
  const { shop_id } = req.query;

  if (typeof shop_id !== "string") {
    res.status(400).json({ message: "Invalid shop_id parameter" });
    return;
  }

  const parsedShopId = parseInt(shop_id, 10);
  if (isNaN(parsedShopId)) {
    res.status(400).json({ message: "Invalid shop_id parameter" });
    return;
  }

  const query = `
        SELECT
            SUM(CASE WHEN upvote = 1 THEN 1 ELSE 0 END) AS upvotes,
            SUM(CASE WHEN downvote = 1 THEN 1 ELSE 0 END) AS downvotes
        FROM votes
        WHERE shop_id = ?
    `;

  try {
    const result = await tursoClient.execute({
      sql: query,
      args: [parsedShopId],
    });

    const rows = result.rows;

    if (rows.length === 0) {
      res.status(200).json({
        shop_id: parsedShopId,
        upvotes: 0,
        downvotes: 0,
      });
      return;
    }

    const row = rows[0];

    const voteResponse = {
      shop_id: parsedShopId,
      upvotes: Number(row[0]) || 0,
      downvotes: Number(row[1]) || 0,
    };

    res.status(200).json(voteResponse);
  } catch (err) {
    res.status(500).json({
      message: "Failed to retrieve votes.",
      error: err.message,
    });
  }
}