import React, { createContext, useContext, useState } from "react";
import { useAuth } from "./authContext";
import { VoteContextData } from "../types/dataTypes";
import { GetVotesForShop, InsertVote } from "../services/vote";

type UserVote = "up" | "down" | null;

const VoteContext = createContext<VoteContextData | undefined>(undefined);

const applyVoteTransition = (
  current: { upvotes: number; downvotes: number; userVote: UserVote },
  nextUserVote: UserVote,
) => {
  let up = current.upvotes;
  let down = current.downvotes;

  // Remove previous vote from totals
  if (current.userVote === "up") up -= 1;
  if (current.userVote === "down") down -= 1;

  // Add new vote to totals
  if (nextUserVote === "up") up += 1;
  if (nextUserVote === "down") down += 1;

  return {
    upvotes: Math.max(0, up),
    downvotes: Math.max(0, down),
    userVote: nextUserVote,
  };
};

export const VoteProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, userMetadata } = useAuth();

  const [votes, setVotes] = useState<
    Record<number, { upvotes: number; downvotes: number; userVote: UserVote }>
  >({});

  const [loadingVotes, setLoadingVotes] = useState<boolean>(false);

  const addVote = (shopId: number, isUpvote: boolean): UserVote => {
    const direction: UserVote = isUpvote ? "up" : "down";
    const current = votes[shopId] || { upvotes: 0, downvotes: 0, userVote: null };
    const nextUserVote: UserVote = current.userVote === direction ? null : direction;

    setVotes((prev) => {
      const cur = prev[shopId] || { upvotes: 0, downvotes: 0, userVote: null };
      return {
        ...prev,
        [shopId]: applyVoteTransition(cur, nextUserVote),
      };
    });

    return nextUserVote;
  };

  const getVotesForShop = async (shopId: number) => {
    setLoadingVotes(true);

    // Set placeholder while loading
    setVotes((prev) => ({
      ...prev,
      [shopId]: prev[shopId] || { upvotes: 0, downvotes: 0, userVote: null },
    }));

    try {
      const userId = userMetadata?.id;
      const voteData = await GetVotesForShop(shopId, userId);

      setVotes((prev) => ({
        ...prev,
        [shopId]: {
          upvotes: voteData?.upvotes ?? 0,
          downvotes: voteData?.downvotes ?? 0,
          userVote: voteData?.userVote ?? null,
        },
      }));
    } catch (error) {
      console.error(`Error fetching votes for shop ${shopId}:`, error);
      setVotes((prev) => ({
        ...prev,
        [shopId]: { upvotes: 0, downvotes: 0, userVote: null },
      }));
    } finally {
      setLoadingVotes(false);
    }
  };

  const submitVote = async (shopId: number, nextUserVote: UserVote) => {
    if (!user || !userMetadata) return;

    try {
      await InsertVote({
        shop_id: shopId,
        user_id: userMetadata.id,
        upvote: nextUserVote === "up",
        downvote: nextUserVote === "down",
      });
    } catch (error) {
      console.error(`Error submitting vote for shopId ${shopId}:`, error);
      throw new Error("Failed to submit vote.");
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