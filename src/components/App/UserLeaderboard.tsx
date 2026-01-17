import { useEffect, useState } from "react";
import {
  getShopCountsByUser,
  ShopCountResult,
} from "@/services/userLeaderboardService";
import UserAvatar from "../Avatar/UserAvatar";

const LeaderboardList = ({
  leaderboard,
}: {
  leaderboard: ShopCountResult[];
}) => {
  return (
    <ul className="divide-y divide-surface-muted dark:divide-gray-700">
      {leaderboard.map((user, index) => {
        if (user.shopCount === 0) return null;
        return (
          <li key={user.userId} className="flex items-center py-4 space-x-4">
            <span className="text-lg font-bold text-text-base dark:text-text-inverted w-6">
              {index + 1}
            </span>
            <div className="w-12 h-12 md:rounded-full md:border-2 md:border-surface-muted dark:md:border-gray-700 md:bg-surface-muted dark:md:bg-gray-700 flex items-center justify-center cursor-pointer">
              {user.avatar ? (
                <UserAvatar
                  avatarId={user.avatar}
                  userEmail={user.email}
                  size="md"
                />
              ) : (
                <span className="text-lg font-medium text-text-base dark:text-text-inverted">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="flex-1 text-lg font-medium text-text-base dark:text-text-inverted">
              {user.email.split("@")[0]}
            </span>
            <span className="text-xl font-semibold text-text-base dark:text-text-inverted">
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

  const stats = [
    {
      label: "Shops",
      value: leaderboard.reduce((acc, user) => acc + user.shopCount, 0),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-surface-light dark:bg-surface-dark p-6 mt-10 font-poppins text-center">
        <h1 className="text-4xl font-extrabold text-text-base dark:text-text-inverted">
          Loading leaderboard...
        </h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-surface-light dark:bg-surface-dark p-6 mt-10 font-poppins text-center">
        <h1 className="text-4xl font-extrabold text-text-base dark:text-red-400">
          Error: {error}
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-surface-light dark:bg-surface-dark p-6 mt-10 font-poppins">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-text-base dark:text-text-inverted">
          Wich Wayz?
          <br />
          Leaderboards
        </h1>
      </header>

      <div className="grid grid-cols-3 gap-6 mb-10">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-4 md:p-6 rounded-xl bg-surface-muted dark:bg-surface-darker text-text-base dark:text-text-inverted shadow-card text-center"
          >
            <h2 className="text-xl font-semibold">{stat.label}</h2>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto bg-surface-muted dark:bg-surface-darker shadow-card p-6 rounded-xl">
        <h2 className="text-center md:text-left text-2xl font-bold mb-4 text-text-base dark:text-text-inverted">
          Top Sandwich Contributors
        </h2>
        <LeaderboardList leaderboard={leaderboard} />
      </div>
    </div>
  );
};

export default UserLeaderboard;
