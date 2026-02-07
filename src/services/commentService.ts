import { authApiRequest } from "./apiClient";
import { Comment } from "@models/Comment";

export async function getComments(shopId: number): Promise<Comment[]> {
  try {
    const response = await authApiRequest<{ comments: Comment[] }>(
      `/comments/${shopId}`,
    );
    return response.comments || [];
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
    const response = await authApiRequest<Comment>("/comments", {
      method: "POST",
      body: JSON.stringify({
        shop_id: shopId,
        body,
      }),
    });
    return response;
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
    const response = await authApiRequest<Comment>(`/comments/${commentId}`, {
      method: "PUT",
      body: JSON.stringify({ body }),
    });
    return response;
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
