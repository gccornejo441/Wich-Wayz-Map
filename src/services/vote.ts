import axios from "axios";

/**
 * Retrieves the total number of upvotes and downvotes for a given shop.
 * GET /api/votes/:shop_id endpoint
 */
export const GetVotesForShop = async (shopId: number) => {
  console.log("Invoking GetVotesForShop with shopId:", shopId);

  try {
    const response = await axios.get(`/api/votes/${shopId}`);
    console.log("GetVotesForShop response status:", response.status);
    console.log("GetVotesForShop response data:", response.data);

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle Axios-specific error
      console.error("Axios error response:", error.response);
      console.error("Axios error message:", error.message);
    } else {
      // Handle non-Axios errors
      console.error("Non-Axios error:", (error as Error).message);
    }

    throw error; // Re-throw error to be handled upstream
  }
};



// Call the POST /api/vote endpoint
export const InsertVote = async (vote: {
  shop_id: number;
  user_id: number;
  upvote: boolean;
  downvote: boolean;
}) => {
  const response = await axios.post("/api/vote", vote);
  return response.data; 
};