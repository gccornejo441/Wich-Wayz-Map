import React, { createContext, useContext, useState } from "react";
import { useAuth } from "./authContext";
import { VoteContextData } from "../types/dataTypes";
import { GetVotesForShop, InsertVote } from "../services/vote";

const VoteContext = createContext<VoteContextData | undefined>(undefined);

export const VoteProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, userMetadata } = useAuth();
  const [votes, setVotes] = useState<
    Record<
      number,
      { upvotes: number; downvotes: number; userVote: "up" | "down" | null }
    >
  >({});

  const [loadingVotes, setLoadingVotes] = useState<boolean>(false);

  const addVote = (
    shopId: number,
    isUpvote: boolean,
    intentionalToggle: boolean = true,
  ) => {
    setVotes((prevVotes) => {
      const currentVote = prevVotes[shopId] || {
        upvotes: 0,
        downvotes: 0,
        userVote: null,
      };

      let newUpvotes = currentVote.upvotes;
      let newDownvotes = currentVote.downvotes;
      const newUserVote: "up" | "down" | null = isUpvote ? "up" : "down";

      if (!intentionalToggle && currentVote.userVote === newUserVote) {
        return prevVotes;
      }

      if (intentionalToggle && currentVote.userVote === newUserVote) {
        return {
          ...prevVotes,
          [shopId]: {
            upvotes: isUpvote ? newUpvotes - 1 : newUpvotes,
            downvotes: !isUpvote ? newDownvotes - 1 : newDownvotes,
            userVote: null,
          },
        };
      }

      if (currentVote.userVote === "up" && !isUpvote) {
        newUpvotes -= 1;
        newDownvotes += 1;
      } else if (currentVote.userVote === "down" && isUpvote) {
        newDownvotes -= 1;
        newUpvotes += 1;
      } else if (currentVote.userVote === null) {
        if (isUpvote) newUpvotes += 1;
        else newDownvotes += 1;
      }

      return {
        ...prevVotes,
        [shopId]: {
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newUserVote,
        },
      };
    });
  };

  const getVotesForShop = async (shopId: number) => {
    setLoadingVotes(true);
    try {
      const voteData = await GetVotesForShop(shopId);
      setVotes((prevVotes) => ({
        ...prevVotes,
        [shopId]: {
          upvotes: voteData ? voteData.upvotes : 0,
          downvotes: voteData ? voteData.downvotes : 0,
          userVote: prevVotes[shopId]?.userVote || null,
        },
      }));
    } catch (error) {
      console.error(`Error fetching votes for shop ${shopId}:`, error);
      setVotes((prevVotes) => ({
        ...prevVotes,
        [shopId]: { upvotes: 0, downvotes: 0, userVote: null },
      }));
    } finally {
      setLoadingVotes(false);
    }
  };

  const submitVote = async (shopId: number, isUpvote: boolean) => {
    if (user && userMetadata) {
      try {
        const newVote = {
          shop_id: shopId,
          user_id: userMetadata.id,
          upvote: isUpvote,
          downvote: !isUpvote,
        };
        await InsertVote(newVote);
      } catch (error) {
        console.error(`Error submitting vote for shopId ${shopId}:`, error);
        throw new Error("Failed to submit vote.");
      }
    }
  };

  return (
    <VoteContext.Provider
      value={{ votes, addVote, getVotesForShop, submitVote, loadingVotes }}
    >
      {children}
    </VoteContext.Provider>
  );
};

export const useVote = () => {
  const context = useContext(VoteContext);
  if (!context) {
    throw new Error("Must be used within a VoteProvider");
  }
  return context;
};
