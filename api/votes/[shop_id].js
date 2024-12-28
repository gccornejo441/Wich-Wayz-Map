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
    console.log("Function invoked: getVotesForShop");

    console.log("Received request:", { method: req.method, query: req.query });

    const { shop_id } = req.query;

    if (typeof shop_id !== 'string') {
        console.error("Invalid shop_id parameter. Expected string, got:", typeof shop_id);
        res.status(400).json({ message: 'Invalid shop_id parameter' });
        return;
    }

    const parsedShopId = parseInt(shop_id, 10);
    if (isNaN(parsedShopId)) {
        console.error("Failed to parse shop_id to integer. Received:", shop_id);
        res.status(400).json({ message: 'Invalid shop_id parameter' });
        return;
    }

    console.log("Parsed shop_id:", parsedShopId);

    const query = `
        SELECT
            SUM(CASE WHEN upvote = 1 THEN 1 ELSE 0 END) AS upvotes,
            SUM(CASE WHEN downvote = 1 THEN 1 ELSE 0 END) AS downvotes
        FROM votes
        WHERE shop_id = ?
    `;

    console.log("Prepared SQL query:", query);
    console.log("Query parameters:", [parsedShopId]);

    try {
        const result = await tursoClient.execute({
            sql: query,
            args: [parsedShopId]
        });

        console.log("Database query executed successfully. Result:", result);

        const rows = result.rows;
        console.log("Rows retrieved from database:", rows);

        if (rows.length === 0) {
            console.warn("No votes found for shop_id:", parsedShopId);
            res.status(200).json({
                shop_id: parsedShopId,
                upvotes: 0,
                downvotes: 0
            });
            return;
        }

        const row = rows[0];
        console.log("First row retrieved:", row);

        const voteResponse = {
            shop_id: parsedShopId,
            upvotes: Number(row[0]) || 0,
            downvotes: Number(row[1]) || 0
        };

        console.log("Vote response prepared:", voteResponse);
        res.status(200).json(voteResponse);
    } catch (err) {
        console.error('Database error during vote retrieval:', err.message);
        console.error('Stack trace:', err.stack);
        res.status(500).json({ message: 'Failed to retrieve votes.', error: err.message });
    }
}
