import { executeQuery } from "../lib/db.js";

export default async function getVotesForShop(req, res) {
  const { shop_id, user_id } = req.query;

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
    const rows = await executeQuery(query, [parsedShopId]);

    if (rows.length === 0) {
      res.status(200).json({
        shop_id: parsedShopId,
        upvotes: 0,
        downvotes: 0,
        userVote: null,
      });
      return;
    }

    const row = rows[0];

    const voteResponse = {
      shop_id: parsedShopId,
      upvotes: Number(row.upvotes) || 0,
      downvotes: Number(row.downvotes) || 0,
      userVote: null,
    };

    // If user_id is provided, get the user's specific vote
    if (user_id) {
      const parsedUserId = parseInt(user_id, 10);
      if (!isNaN(parsedUserId)) {
        const userVoteQuery = `
          SELECT upvote, downvote
          FROM votes
          WHERE shop_id = ? AND user_id = ?
        `;
        const userVoteRows = await executeQuery(userVoteQuery, [
          parsedShopId,
          parsedUserId,
        ]);

        if (userVoteRows.length > 0) {
          const userVoteRow = userVoteRows[0];
          if (userVoteRow.upvote === 1) {
            voteResponse.userVote = "up";
          } else if (userVoteRow.downvote === 1) {
            voteResponse.userVote = "down";
          }
        }
      }
    }

    res.status(200).json(voteResponse);
  } catch (err) {
    res.status(500).json({
      message: "Failed to retrieve votes.",
      error: err.message,
    });
  }
}
