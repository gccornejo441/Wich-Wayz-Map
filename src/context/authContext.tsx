import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

import { getCurrentUser, loginUser } from "../services/security";
import { User } from "../services/shopLocation";

interface AuthContextData {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  resetPassword: (
    email: string,
  ) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    };

    fetchUser();
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await loginUser(email, password);

      if (response.status === "success") {
        setUser(response.user);
        return { success: true, message: response.message };
      }

      console.error("Login failed:", response.message);
      return { success: false, message: response.message };
    } catch (error) {
      console.error("Unexpected error during login:", error);
      return {
        success: false,
        message: "An unexpected error occurred. Please try again later.",
      };
    }
  };

  const logout = () => {
    setUser(null);
  };

  const resetPassword = async (
    email: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await resetPassword(email);

    if (response.success) {
      return { success: true, message: response.message };
    }
    return { success: false, message: response.message };
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        login,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("Must be used within an AuthProvider");
  }
  return context;
};
