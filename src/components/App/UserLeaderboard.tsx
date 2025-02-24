import { useUserLeaderboard } from "@/context/userLeaderboardContext";

const UserLeaderboard = () => {
  const { leaderboard, loading, error } = useUserLeaderboard();

  const stats = [
    { label: "Shops added", value: "0", color: "bg-primary" },
    // { label: "Shops visited", value: "1,203", color: "bg-primary" },
    // { label: "Sandwiches reviewed", value: "678", color: "bg-primary" },
    // { label: "Top-rated shops", value: "156", color: "bg-primary" },
    // { label: "Goals achieved", value: "276", color: "bg-primary" },
    // { label: "Comments posted", value: "78", color: "bg-primary" },
    // { label: "Hours exploring", value: "6,567", color: "bg-primary" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 mt-10 font-poppins text-center">
        <h1 className="text-4xl font-extrabold text-dark">Loading leaderboard...</h1>
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
        <h1 className="text-4xl font-extrabold text-dark">Wich Wayz Leaderboards</h1>
      </header>

      <div className="grid grid-cols-3 gap-6 mb-10">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-6 rounded-xl text-secondary ${stat.color} shadow-card text-center`}
          >
            <h2 className="text-xl font-semibold">{stat.label}</h2>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto bg-lightGray shadow-card p-6 rounded-xl">
        <h2 className="text-2xl font-bold mb-4 text-primary">Top Sandwich Explorers</h2>
        <ul className="divide-y divide-gray-300">
          {leaderboard.map((user, index) => (
            <li key={user.userId} className="flex items-center py-4 space-x-4">
              <span className="text-lg font-bold text-accent w-6">{index + 1}</span>
              <div className="w-12 h-12 rounded-full border-2 border-primaryBorder bg-gray-200 flex items-center justify-center">
                <span className="text-lg font-medium text-dark">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="flex-1 text-lg font-medium text-dark">{user.email.split("@")[0]}</span>
              <span className="text-xl font-semibold text-secondary">
                {user.shopCount} shops
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UserLeaderboard;