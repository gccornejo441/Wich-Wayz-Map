import { apiRequest, authApiRequest } from "./apiClient";
import { auth } from "./firebase";
import {
  REACTION_TYPES,
  type Comment,
  type ReactionCounts,
  type ReactionType,
} from "@models/Comment";

// Raw API response format (snake_case from backend)
interface RawComment {
  id: number;
  shop_id: number;
  user_id: number;
  body: string;
  date_created: string;
  date_modified?: string | null;
  user_name?: string | null;
  user_avatar?: string | null;
  user_email?: string | null;
  reaction_counts?: unknown;
  user_reaction?: unknown;
  reactionCounts?: unknown;
  userReaction?: unknown;
}

interface RawSetReactionResponse {
  reaction_counts?: unknown;
  user_reaction?: unknown;
  reactionCounts?: unknown;
  userReaction?: unknown;
}

export interface SetReactionResponse {
  reactionCounts: ReactionCounts;
  userReaction: ReactionType | null;
}

const REACTION_TYPE_SET = new Set<ReactionType>(REACTION_TYPES);

const normalizeReactionType = (value: unknown): ReactionType | null => {
  if (typeof value !== "string") return null;
  return REACTION_TYPE_SET.has(value as ReactionType)
    ? (value as ReactionType)
    : null;
};

const normalizeReactionCounts = (value: unknown): ReactionCounts => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const counts: ReactionCounts = {};
  const record = value as Record<string, unknown>;

  for (const reactionType of REACTION_TYPES) {
    const count = record[reactionType];
    if (typeof count === "number" && Number.isFinite(count) && count > 0) {
      counts[reactionType] = Math.floor(count);
    }
  }

  return counts;
};

// Transform snake_case API response to camelCase for TypeScript interface
function normalizeComment(raw: RawComment): Comment {
  const hasReactionCounts =
    Object.prototype.hasOwnProperty.call(raw, "reaction_counts") ||
    Object.prototype.hasOwnProperty.call(raw, "reactionCounts");
  const hasUserReaction =
    Object.prototype.hasOwnProperty.call(raw, "user_reaction") ||
    Object.prototype.hasOwnProperty.call(raw, "userReaction");

  return {
    id: raw.id,
    shopId: raw.shop_id,
    userId: raw.user_id,
    body: raw.body,
    dateCreated: raw.date_created,
    dateModified: raw.date_modified,
    userName: raw.user_name,
    userAvatar: raw.user_avatar,
    userEmail: raw.user_email,
    reactionCounts: hasReactionCounts
      ? normalizeReactionCounts(raw.reaction_counts ?? raw.reactionCounts)
      : undefined,
    userReaction: hasUserReaction
      ? normalizeReactionType(raw.user_reaction ?? raw.userReaction)
      : undefined,
  };
}

export async function getComments(shopId: number): Promise<Comment[]> {
  try {
    let response: RawComment[] | undefined;

    if (auth.currentUser) {
      try {
        response = await authApiRequest<RawComment[]>(`/comments/${shopId}`);
      } catch (error) {
        // If auth state changed mid-request, retry as a public read.
        if (error instanceof Error && error.message === "Not authenticated") {
          response = await apiRequest<RawComment[]>(`/comments/${shopId}`);
        } else {
          throw error;
        }
      }
    } else {
      response = await apiRequest<RawComment[]>(`/comments/${shopId}`);
    }

    return (response || []).map(normalizeComment);
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw new Error("Failed to fetch comments");
  }
}

export async function getCommentsForShop(shopId: number): Promise<Comment[]> {
  return getComments(shopId);
}

export async function addComment(
  shopId: number,
  body: string,
): Promise<Comment> {
  try {
    const response = await authApiRequest<RawComment>("/comments", {
      method: "POST",
      body: JSON.stringify({
        shop_id: shopId,
        body,
      }),
    });
    return normalizeComment(response);
  } catch (error) {
    console.error("Error adding comment:", error);
    throw new Error("Failed to add comment");
  }
}

export async function createComment(payload: {
  shopId: number;
  userId: number;
  body: string;
}): Promise<Comment> {
  return addComment(payload.shopId, payload.body);
}

export async function updateComment(
  commentId: number,
  body: string,
): Promise<Comment> {
  try {
    const response = await authApiRequest<RawComment>(
      `/comments/${commentId}`,
      {
        method: "PUT",
        body: JSON.stringify({ body }),
      },
    );
    return normalizeComment(response);
  } catch (error) {
    console.error("Error updating comment:", error);
    throw new Error("Failed to update comment");
  }
}

export async function deleteComment(commentId: number): Promise<void> {
  try {
    await authApiRequest(`/comments/${commentId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw new Error("Failed to delete comment");
  }
}

export async function setCommentReaction(
  commentId: number,
  reactionType: ReactionType | null,
): Promise<SetReactionResponse> {
  try {
    const response = await authApiRequest<RawSetReactionResponse>(
      `/comments/${commentId}/reaction`,
      {
        method: "POST",
        body: JSON.stringify({
          reactionType,
          reaction_type: reactionType,
        }),
      },
    );

    return {
      reactionCounts: normalizeReactionCounts(
        response.reaction_counts ?? response.reactionCounts,
      ),
      userReaction: normalizeReactionType(
        response.user_reaction ?? response.userReaction,
      ),
    };
  } catch (error) {
    console.error("Error setting comment reaction:", error);
    throw new Error("Failed to set comment reaction");
  }
}
