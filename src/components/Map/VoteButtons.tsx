interface VoteButtonsProps {
  isMember: boolean | undefined;
  userVote: "up" | "down" | null;
  handleVote: (isUpvote: boolean) => void;
  upvotes: number;
  downvotes: number;
}

const VoteButtons = ({
  isMember,
  userVote,
  handleVote,
  upvotes,
  downvotes,
}: VoteButtonsProps) => {
  // Ensure votes are always valid numbers
  const safeUpvotes =
    typeof upvotes === "number" && !isNaN(upvotes) ? upvotes : 0;
  const safeDownvotes =
    typeof downvotes === "number" && !isNaN(downvotes) ? downvotes : 0;

  return (
    <div className="flex justify-around mt-4">
      <button
        onClick={() => handleVote(true)}
        title={isMember ? "I like this!" : "Sign in to vote"}
        className={`px-3 py-1 dark:bg-surface-dark dark:border dark:border-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-secondary-dark focus:outline-none ${
          isMember ? "bg-primary" : "bg-primary/50 cursor-pointer"
        }`}
        disabled={isMember && userVote === "up"}
      >
        👍 {safeUpvotes}
      </button>
      <button
        onClick={() => handleVote(false)}
        title={isMember ? "I don't like this." : "Sign in to vote"}
        className={`px-3 py-1 dark:bg-surface-dark dark:border dark:border-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-secondary-dark focus:outline-none ${
          isMember ? "bg-primary" : "bg-primary/50 cursor-pointer"
        }`}
        disabled={isMember && userVote === "down"}
      >
        👎 {safeDownvotes}
      </button>
    </div>
  );
};

export default VoteButtons;
