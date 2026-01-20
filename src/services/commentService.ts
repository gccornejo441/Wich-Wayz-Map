import axios from "axios";
import { Comment } from "@models/Comment";
import { AddCommentPayload } from "../types/dataTypes";

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";
const client = axios.create({ baseURL: apiBase });

const mapComment = (data: Record<string, unknown>): Comment => ({
  id: Number(data.id),
  shopId: Number(data.shop_id ?? data.shopId),
  userId: Number(data.user_id ?? data.userId),
  body: String(data.body ?? ""),
  dateCreated: String(data.date_created ?? data.dateCreated ?? ""),
  dateModified:
    (data.date_modified as string | null | undefined) ??
    (data.dateModified as string | null | undefined) ??
    null,
  userName:
    (data.user_name as string | null | undefined) ??
    (data.userName as string | null | undefined) ??
    null,
  userAvatar:
    (data.user_avatar as string | null | undefined) ??
    (data.userAvatar as string | null | undefined) ??
    null,
  userEmail:
    (data.user_email as string | null | undefined) ??
    (data.userEmail as string | null | undefined) ??
    null,
});

export const getCommentsForShop = async (
  shopId: number,
): Promise<Comment[]> => {
  const response = await client.get(`/comments/${shopId}`);
  const comments = Array.isArray(response.data) ? response.data : [];
  return comments.map((comment) =>
    mapComment(comment as Record<string, unknown>),
  );
};

export const createComment = async (
  payload: AddCommentPayload,
): Promise<Comment> => {
  const response = await client.post("/comments", {
    shop_id: payload.shopId,
    user_id: payload.userId,
    body: payload.body,
  });

  return mapComment(response.data as Record<string, unknown>);
};
