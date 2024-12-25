
export interface Vote {
    shop_id: number;
    user_id: number;
    upvote: number;
    downvote: number;
  }
  
  export interface VoteResponse {
    shop_id: number;
    upvotes: number;
    downvotes: number;
  }
  