import { tursoClient } from "./webhook";

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
    const result = await tursoClient.execute({ sql: query, args: params });
    console.log(
      `Vote submission result: ${result.rowsAffected} row(s) affected.`
    );
    res.status(200).json("Vote submitted successfully");
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) {
      console.log("Conflict error: User has already voted on this shop.");
      res.status(409).json("User has already voted on this shop.");
    } else {
      console.error("Database error during vote submission:", err);
      res.status(500).json("An error occurred while submitting the vote.");
    }
  }
}
