import axios from "axios";

export type ShopVoteResponse = {
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
};

/**
 * Retrieves the total number of upvotes and downvotes for a given shop,
 * plus the current user's vote if userId is provided.
 *  GET /api/votes/:shop_id?user_id=123 endpoint
 */
export const GetVotesForShop = async (shopId: number, userId?: number) => {
  const response = await axios.get<ShopVoteResponse>(`/api/votes/${shopId}`, {
    params: userId ? { user_id: userId } : undefined,
  });
  return response.data;
};

/**
 * Submits a user's vote on a shop.
 *  POST /api/vote endpoint
 */
export const InsertVote = async (vote: {
  shop_id: number;
  user_id: number;
  upvote: boolean;
  downvote: boolean;
}) => {
  const response = await axios.post("/api/vote", vote);
  return response.data;
};
