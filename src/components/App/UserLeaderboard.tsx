import { useEffect, useState } from "react";
import {
  getShopCountsByUser,
  ShopCountResult,
} from "@/services/userLeaderboardService";
import UserAvatar from "../Avatar/UserAvatar";

/**
 * Retrieves the number of shops created by each user.
 * @returns A list of objects containing the user's ID, email, and the number of shops they created.
 */
const LeaderboardList = ({
  leaderboard,
}: {
  leaderboard: ShopCountResult[];
}) => {
  return (
    <ul className="divide-y divide-gray-300">
      {leaderboard.map((user, index) => {
        if (user.shopCount === 0) return null;
        return (
          <li key={user.userId} className="flex items-center py-4 space-x-4">
            <span className="text-lg font-bold text-accent w-6">
              {index + 1}
            </span>
            <div className="w-12 h-12 md:rounded-full  md:border-2 md:border-primaryBorder md:bg-gray-200 flex items-center justify-center cursor-pointer">
              {user.avatar ? (
                <UserAvatar
                  avatarId={user.avatar}
                  userEmail={user.email}
                  size="md"
                />
              ) : (
                <span className="text-lg font-medium text-dark">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="flex-1 text-lg font-medium text-dark">
              {user.email.split("@")[0]}
            </span>
            <span className="text-xl font-semibold text-dark">
              {user.shopCount} shops
            </span>
          </li>
        );
      })}
    </ul>
  );
};

const UserLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<ShopCountResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await getShopCountsByUser();
        setLeaderboard(data);
      } catch (err) {
        const error = err as Error;
        console.error("Failed to fetch leaderboard:", error);
        setError("Failed to fetch leaderboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // This creates the bubble that are displayed on top of the leaderboard.
  // If you add more stats, then you can show them here.
  const stats = [
    {
      label: "Shops",
      value: leaderboard.reduce((acc, user) => acc + user.shopCount, 0),
      color: "bg-primary",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 mt-10 font-poppins text-center">
        <h1 className="text-4xl font-extrabold text-dark">
          Loading leaderboard...
        </h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 mt-10 font-poppins text-center">
        <h1 className="text-4xl font-extrabold text-dark">Error: {error}</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 mt-10 font-poppins">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-dark">
          Wich Wayz?
          <br />
          Leaderboards
        </h1>
      </header>

      <div className="grid grid-cols-3 gap-6 mb-10">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-4 md:p-6 rounded-xl text-secondary ${stat.color} shadow-card text-center`}
          >
            <h2 className="text-xl font-semibold">{stat.label}</h2>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto bg-lightGray shadow-card p-6 rounded-xl">
        <h2 className="text-center md:text-left text-2xl font-bold mb-4 text-primary">
          Top Sandwich Contributors
        </h2>
        <LeaderboardList leaderboard={leaderboard} />
      </div>
    </div>
  );
};

export default UserLeaderboard;
