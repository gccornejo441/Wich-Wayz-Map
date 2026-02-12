import { executeQuery } from "../../lib/db.js";
import { withActiveAccount } from "../../lib/withAuth.js";

const REACTION_TYPES = new Set([
  "like",
  "love",
  "care",
  "haha",
  "wow",
  "angry",
  "sad",
]);

const normalizeReactionTypeInput = (req) => {
  const raw = req.body?.reaction_type ?? req.body?.reactionType;

  if (raw === null) {
    return { valid: true, value: null };
  }

  if (typeof raw !== "string") {
    return { valid: false, value: null };
  }

  const normalized = raw.trim().toLowerCase();
  if (!REACTION_TYPES.has(normalized)) {
    return { valid: false, value: null };
  }

  return { valid: true, value: normalized };
};

const buildReactionCounts = (rows) => {
  const reactionCounts = {};

  for (const row of rows ?? []) {
    const reactionType = String(row.reaction_type || "").toLowerCase();
    const count = Number(row.count);

    if (
      REACTION_TYPES.has(reactionType) &&
      Number.isFinite(count) &&
      count > 0
    ) {
      reactionCounts[reactionType] = Math.floor(count);
    }
  }

  return reactionCounts;
};

async function setCommentReaction(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const { comment_id } = req.query;
  const parsedCommentId = Number(comment_id);
  if (!Number.isInteger(parsedCommentId) || parsedCommentId <= 0) {
    res.status(400).json({ message: "Invalid comment ID" });
    return;
  }

  const parsedUserId = Number(req.dbUser?.id);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const parsedReaction = normalizeReactionTypeInput(req);
  if (!parsedReaction.valid) {
    res.status(400).json({
      message:
        "reactionType must be null or one of: like, love, care, haha, wow, angry, sad",
    });
    return;
  }

  try {
    const commentLookup = await executeQuery(
      `SELECT id FROM comments WHERE id = ? LIMIT 1`,
      [parsedCommentId],
    );

    if (!commentLookup || commentLookup.length === 0) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }

    if (parsedReaction.value === null) {
      await executeQuery(
        `
          DELETE FROM comment_reactions
          WHERE comment_id = ? AND user_id = ?;
        `,
        [parsedCommentId, parsedUserId],
      );
    } else {
      await executeQuery(
        `
          INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
          VALUES (?, ?, ?)
          ON CONFLICT(comment_id, user_id)
          DO UPDATE SET
            reaction_type = excluded.reaction_type,
            date_modified = CURRENT_TIMESTAMP;
        `,
        [parsedCommentId, parsedUserId, parsedReaction.value],
      );
    }

    const reactionRows = await executeQuery(
      `
        SELECT reaction_type, COUNT(*) AS count
        FROM comment_reactions
        WHERE comment_id = ?
        GROUP BY reaction_type;
      `,
      [parsedCommentId],
    );

    const userReactionRow = await executeQuery(
      `
        SELECT reaction_type
        FROM comment_reactions
        WHERE comment_id = ? AND user_id = ?
        LIMIT 1;
      `,
      [parsedCommentId, parsedUserId],
    );

    const userReactionValue =
      typeof userReactionRow?.[0]?.reaction_type === "string" &&
      REACTION_TYPES.has(userReactionRow[0].reaction_type.toLowerCase())
        ? userReactionRow[0].reaction_type.toLowerCase()
        : null;

    res.status(200).json({
      reaction_counts: buildReactionCounts(reactionRows),
      user_reaction: userReactionValue,
    });
  } catch (error) {
    console.error("Failed to set comment reaction:", error);
    if (
      error instanceof Error &&
      /no such table:\s*comment_reactions/i.test(error.message)
    ) {
      res.status(500).json({
        message:
          "Database not migrated for comment reactions yet. Run migration 006_comment_reactions.sql",
      });
      return;
    }
    res.status(500).json({ message: "Failed to set comment reaction." });
  }
}

export default withActiveAccount(setCommentReaction);
