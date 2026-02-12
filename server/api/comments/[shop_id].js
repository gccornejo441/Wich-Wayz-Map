import { executeQuery } from "../lib/db.js";
import { verifyFirebaseToken } from "../lib/firebaseAdmin.js";

const REACTION_TYPES = new Set([
  "like",
  "love",
  "care",
  "haha",
  "wow",
  "angry",
  "sad",
]);

const extractBearerToken = (req) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
};

const isMissingCommentReactionsTableError = (error) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /no such table:\s*comment_reactions/i.test(message);
};

async function resolveAuthenticatedUserId(req) {
  const token = extractBearerToken(req);
  if (!token) return null;

  try {
    const decodedToken = await verifyFirebaseToken(token);
    const firebaseUid = decodedToken?.uid;
    if (!firebaseUid) return null;

    const result = await executeQuery(
      `SELECT id FROM users WHERE firebase_uid = ? LIMIT 1`,
      [firebaseUid],
    );
    const parsedUserId = Number(result?.[0]?.id);

    return Number.isInteger(parsedUserId) && parsedUserId > 0
      ? parsedUserId
      : null;
  } catch (error) {
    console.warn("Unable to resolve authenticated user for comments GET.");
    console.warn(error);
    return null;
  }
}

async function getReactionSummaryForComments(commentIds) {
  if (!Array.isArray(commentIds) || commentIds.length === 0) {
    return new Map();
  }

  const placeholders = commentIds.map(() => "?").join(", ");

  const rows = await executeQuery(
    `
      SELECT comment_id, reaction_type, COUNT(*) AS count
      FROM comment_reactions
      WHERE comment_id IN (${placeholders})
      GROUP BY comment_id, reaction_type;
    `,
    commentIds,
  );

  const reactionSummary = new Map();

  for (const row of rows ?? []) {
    const commentId = Number(row.comment_id);
    const reactionType = String(row.reaction_type || "").toLowerCase();
    const count = Number(row.count);

    if (
      !Number.isInteger(commentId) ||
      commentId <= 0 ||
      !REACTION_TYPES.has(reactionType) ||
      !Number.isFinite(count) ||
      count <= 0
    ) {
      continue;
    }

    const existing = reactionSummary.get(commentId) ?? {};
    existing[reactionType] = Math.floor(count);
    reactionSummary.set(commentId, existing);
  }

  return reactionSummary;
}

async function getUserReactionByComment(commentIds, userId) {
  if (
    !Array.isArray(commentIds) ||
    commentIds.length === 0 ||
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    return new Map();
  }

  const placeholders = commentIds.map(() => "?").join(", ");
  const rows = await executeQuery(
    `
      SELECT comment_id, reaction_type
      FROM comment_reactions
      WHERE user_id = ?
        AND comment_id IN (${placeholders});
    `,
    [userId, ...commentIds],
  );

  const userReactionByComment = new Map();

  for (const row of rows ?? []) {
    const commentId = Number(row.comment_id);
    const reactionType = String(row.reaction_type || "").toLowerCase();

    if (
      Number.isInteger(commentId) &&
      commentId > 0 &&
      REACTION_TYPES.has(reactionType)
    ) {
      userReactionByComment.set(commentId, reactionType);
    }
  }

  return userReactionByComment;
}

export default async function handleComments(req, res) {
  const { shop_id } = req.query;

  // Handle GET requests (fetch comments for a shop)
  if (req.method === "GET") {
    await getCommentsForShop(req, res, shop_id);
  }
  // Handle PUT requests (update a comment) - shop_id is actually comment_id here
  else if (req.method === "PUT") {
    await updateComment(req, res, shop_id);
  }
  // Handle DELETE requests (delete a comment) - shop_id is actually comment_id here
  else if (req.method === "DELETE") {
    await deleteComment(req, res, shop_id);
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}

async function getCommentsForShop(req, res, shop_id) {
  if (typeof shop_id !== "string") {
    res.status(400).json({ message: "Invalid shop_id parameter" });
    return;
  }

  const parsedShopId = parseInt(shop_id, 10);
  if (Number.isNaN(parsedShopId)) {
    res.status(400).json({ message: "Invalid shop_id parameter" });
    return;
  }

  const query = `
    SELECT
      c.id,
      c.shop_id,
      c.user_id,
      c.body,
      c.date_created,
      c.date_modified,
      u.username AS user_name,
      u.avatar AS user_avatar,
      u.email AS user_email
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.shop_id = ?
    ORDER BY c.date_created DESC
    LIMIT 100;
  `;

  try {
    const result = await executeQuery(query, [parsedShopId]);
    const commentsBase =
      result?.map((row) => ({
        id: Number(row.id),
        shop_id: Number(row.shop_id),
        user_id: Number(row.user_id),
        body: row.body,
        date_created: row.date_created,
        date_modified: row.date_modified ?? null,
        user_name: row.user_name || null,
        user_avatar: row.user_avatar || null,
        user_email: row.user_email || null,
      })) ?? [];

    if (commentsBase.length === 0) {
      res.status(200).json([]);
      return;
    }

    const commentIds = commentsBase.map((comment) => comment.id);
    const authenticatedUserId = await resolveAuthenticatedUserId(req);

    let reactionSummaryByComment = new Map();
    let userReactionByComment = new Map();

    try {
      reactionSummaryByComment =
        await getReactionSummaryForComments(commentIds);
      userReactionByComment = await getUserReactionByComment(
        commentIds,
        authenticatedUserId,
      );
    } catch (reactionError) {
      if (isMissingCommentReactionsTableError(reactionError)) {
        console.warn(
          "comment_reactions table missing. Run migration 006_comment_reactions.sql.",
        );
      } else {
        throw reactionError;
      }
    }

    const comments = commentsBase.map((comment) => ({
      ...comment,
      reaction_counts: reactionSummaryByComment.get(comment.id) ?? {},
      user_reaction: userReactionByComment.get(comment.id) ?? null,
    }));

    res.status(200).json(comments);
  } catch (err) {
    console.error("Failed to fetch comments:", err);
    res.status(500).json({
      message: "Failed to retrieve comments.",
    });
  }
}

async function updateComment(req, res, comment_id) {
  const parsedCommentId = parseInt(comment_id, 10);
  if (Number.isNaN(parsedCommentId)) {
    res.status(400).json({ message: "Invalid comment ID" });
    return;
  }

  const { user_id, body } = req.body ?? {};
  const bodyUserId = parseInt(user_id, 10);
  const authenticatedUserId = await resolveAuthenticatedUserId(req);
  const parsedUserId =
    authenticatedUserId ??
    (Number.isNaN(bodyUserId) ? null : Number(bodyUserId));
  const trimmedBody =
    typeof body === "string" ? body.trim().slice(0, 5000) : "";

  if (!Number.isInteger(parsedUserId) || trimmedBody.length === 0) {
    res.status(400).json({ message: "user_id/auth and body are required" });
    return;
  }

  try {
    // First, verify the comment exists and belongs to the user
    const existingComment = await executeQuery(
      `SELECT user_id FROM comments WHERE id = ? LIMIT 1`,
      [parsedCommentId],
    );

    if (!existingComment || existingComment.length === 0) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }

    if (existingComment[0].user_id !== parsedUserId) {
      res.status(403).json({ message: "You can only edit your own comments" });
      return;
    }

    // Update the comment
    const updateQuery = `
      UPDATE comments
      SET body = ?, date_modified = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, shop_id, user_id, body, date_created, date_modified;
    `;

    const result = await executeQuery(updateQuery, [
      trimmedBody,
      parsedCommentId,
    ]);

    const updated = result?.[0];

    if (!updated) {
      res.status(500).json({ message: "Failed to update comment." });
      return;
    }

    // Fetch user details
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

    res.status(200).json({
      id: Number(updated.id),
      shop_id: Number(updated.shop_id),
      user_id: Number(updated.user_id),
      body: updated.body,
      date_created: updated.date_created,
      date_modified: updated.date_modified,
      user_name: userRow.user_name || null,
      user_avatar: userRow.user_avatar || null,
      user_email: userRow.user_email || null,
    });
  } catch (err) {
    console.error("Failed to update comment:", err);
    res.status(500).json({ message: "Failed to update comment." });
  }
}

async function deleteComment(req, res, comment_id) {
  const parsedCommentId = parseInt(comment_id, 10);
  if (Number.isNaN(parsedCommentId)) {
    res.status(400).json({ message: "Invalid comment ID" });
    return;
  }

  const { user_id } = req.body ?? {};
  const bodyUserId = parseInt(user_id, 10);
  const authenticatedUserId = await resolveAuthenticatedUserId(req);
  const parsedUserId =
    authenticatedUserId ??
    (Number.isNaN(bodyUserId) ? null : Number(bodyUserId));

  if (!Number.isInteger(parsedUserId)) {
    res.status(400).json({ message: "user_id/auth is required" });
    return;
  }

  try {
    // First, verify the comment exists and belongs to the user
    const existingComment = await executeQuery(
      `SELECT user_id FROM comments WHERE id = ? LIMIT 1`,
      [parsedCommentId],
    );

    if (!existingComment || existingComment.length === 0) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }

    if (existingComment[0].user_id !== parsedUserId) {
      res
        .status(403)
        .json({ message: "You can only delete your own comments" });
      return;
    }

    // Delete the comment
    await executeQuery(`DELETE FROM comments WHERE id = ?`, [parsedCommentId]);

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Failed to delete comment:", err);
    res.status(500).json({ message: "Failed to delete comment." });
  }
}
