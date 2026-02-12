import { apiRequest, authApiRequest } from "./apiClient";
import { Comment } from "@models/Comment";

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
}

// Transform snake_case API response to camelCase for TypeScript interface
function normalizeComment(raw: RawComment): Comment {
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
  };
}

export async function getComments(shopId: number): Promise<Comment[]> {
  try {
    const response = await apiRequest<RawComment[]>(`/comments/${shopId}`);
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
