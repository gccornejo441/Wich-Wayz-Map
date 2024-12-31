import { createClient } from "@libsql/client/web";

const TURSO_URL = process.env.TURSO_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
  throw new Error(
    "Environment variables TURSO_API_KEY and TURSO_DATABASE_URL must be set",
  );
}

export const tursoClient = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

/**
 * Handles POST requests to submit a user's vote on a shop.
 *
 * POST /api/vote
 */
export default async function submitVote(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const vote = req.body;

  const query = `
        INSERT INTO votes (shop_id, user_id, upvote, downvote)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (shop_id, user_id) DO UPDATE
        SET upvote = excluded.upvote, downvote = excluded.downvote
    `;

  const params = [vote.shop_id, vote.user_id, vote.upvote, vote.downvote];

  try {
    await tursoClient.execute({ sql: query, args: params });
    res.status(200).json("Vote submitted successfully");
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) {
      res.status(409).json("User has already voted on this shop.");
    } else {
      res.status(500).json("An error occurred while submitting the vote.");
    }
  }
}
