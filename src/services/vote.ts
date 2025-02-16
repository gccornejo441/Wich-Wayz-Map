import axios from "axios";

/**
 * Retrieves the total number of upvotes and downvotes for a given shop.
 *  GET /api/votes/:shop_id endpoint
 */
export const GetVotesForShop = async (shopId: number) => {
  const response = await axios.get(`/api/votes/${shopId}`);
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
