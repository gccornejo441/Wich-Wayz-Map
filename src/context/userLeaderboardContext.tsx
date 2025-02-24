import { getShopCountsByUser, ShopCountResult } from "@/services/userLeaderboardService";
import React, { createContext, useContext, useEffect, useState } from "react";

interface UserLeaderboardContextType {
  leaderboard: ShopCountResult[];
  loading: boolean;
  error: string | null;
}

const UserLeaderboardContext = createContext<UserLeaderboardContextType>({
  leaderboard: [],
  loading: true,
  error: null,
});

export const useUserLeaderboard = () => useContext(UserLeaderboardContext);

export const UserLeaderboardProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    const [leaderboard, setLeaderboard] = useState<ShopCountResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      const fetchLeaderboard = async () => {
        try {
        
          const shopCounts = await getShopCountsByUser();
          setLeaderboard(shopCounts);
          setError(null);
        } catch (err) {
          console.error("Failed to fetch leaderboard:", err);
          setError("Failed to fetch leaderboard data.");
        } finally {
          setLoading(false);
        }
      };
  
      fetchLeaderboard();
    }, []);
  
    return (
      <UserLeaderboardContext.Provider value={{ leaderboard, loading, error }}>
        {children}
      </UserLeaderboardContext.Provider>
    );
  };