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
  const canVote = !!isMember;

  const safeUpvotes = typeof upvotes === "number" && !isNaN(upvotes) ? upvotes : 0;
  const safeDownvotes = typeof downvotes === "number" && !isNaN(downvotes) ? downvotes : 0;

  return (
    <div className="flex justify-around mt-4">
      <button
        onClick={() => handleVote(true)}
        title={canVote ? "I like this!" : "Sign in to vote"}
        disabled={!canVote}
        aria-pressed={userVote === "up"}
        className={[
          "px-3 py-1 rounded-lg focus:outline-none",
          "dark:bg-surface-dark dark:border dark:border-gray-700 text-gray-900 dark:text-white",
          canVote ? "hover:bg-secondary-dark" : "opacity-60 cursor-not-allowed",
          userVote === "up" ? "ring-2 ring-offset-2 ring-offset-transparent" : "",
          "bg-primary",
        ].join(" ")}
      >
        👍 {safeUpvotes}
      </button>

      <button
        onClick={() => handleVote(false)}
        title={canVote ? "I don't like this." : "Sign in to vote"}
        disabled={!canVote}
        aria-pressed={userVote === "down"}
        className={[
          "px-3 py-1 rounded-lg focus:outline-none",
          "dark:bg-surface-dark dark:border dark:border-gray-700 text-gray-900 dark:text-white",
          canVote ? "hover:bg-secondary-dark" : "opacity-60 cursor-not-allowed",
          userVote === "down" ? "ring-2 ring-offset-2 ring-offset-transparent" : "",
          "bg-primary",
        ].join(" ")}
      >
        👎 {safeDownvotes}
      </button>
    </div>
  );
};

export default VoteButtons;