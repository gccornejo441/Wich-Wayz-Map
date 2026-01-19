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
}: VoteButtonsProps) => (
  <div className="flex justify-around mt-4">
      <button
        onClick={() => handleVote(true)}
        title={isMember ? "I like this!" : "Only members can vote"}
        className={`px-3 py-1 dark:bg-surface-dark dark:border dark:border-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-secondary-dark focus:outline-none ${
          isMember ? "bg-primary" : "bg-primary/50 cursor-not-allowed"
        }`}
        disabled={!isMember || userVote === "up"}
      >
        👍 {upvotes}
      </button>
      <button
        onClick={() => handleVote(false)}
        title={isMember ? "I don't like this." : "Only members can vote"}
        className={`px-3 py-1 dark:bg-surface-dark dark:border dark:border-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-secondary-dark focus:outline-none ${
          isMember ? "bg-primary" : "bg-primary/50 cursor-not-allowed"
        }`}
        disabled={!isMember || userVote === "down"}
      >
        👎 {downvotes}
      </button>
    </div>
);

export default VoteButtons;
