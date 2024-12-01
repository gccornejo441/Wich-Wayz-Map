import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { FirebaseError } from "firebase/app";
import bcrypt from "bcryptjs";
import { getUser, storeUser } from "../services/apiClient";

export interface UserMetadata {
  id: number;
  firebaseUid: string;
  email: string;
  hashedPassword: string;
  username: string | null;
  verified: boolean;
  verificationToken: string | null;
  modifiedBy: string | null;
  dateCreated: string;
  dateModified: string;
  membershipStatus: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  accountStatus: string;
  lastLogin: string | null;
  avatar: string | null;
  tokenExpiry: string | null;
  resetToken: string | null;
}

interface AuthContextData {
  user: FirebaseUser | null;
  userMetadata: UserMetadata | null;
  setUser: React.Dispatch<React.SetStateAction<FirebaseUser | null>>;
  setUserMetadata: React.Dispatch<React.SetStateAction<UserMetadata | null>>;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  resetPassword: (
    email: string,
  ) => Promise<{ success: boolean; message: string }>;
  register: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const persistence = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;

      await setPersistence(auth, persistence);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const { user } = userCredential;

      if (!user) {
        return { success: false, message: "Failed to authenticate user." };
      }

      const userMetadata = await getUser(user.uid);

      setUserMetadata(userMetadata);

      return { success: true, message: "Login successful." };
    } catch (error: unknown) {
      if (error instanceof FirebaseError) {
        console.error("Firebase login error:", error.code);

        const errorMessages: Record<string, string> = {
          "auth/user-not-found":
            "No account found with this email. Please sign up or check your email address.",
          "auth/wrong-password":
            "The password you entered is incorrect. Please try again.",
          "auth/too-many-requests":
            "Too many failed attempts. Please wait a few minutes and try again.",
          "auth/network-request-failed":
            "Network error. Please check your connection and try again.",
          "auth/invalid-email": "Wrong email or password",
        };

        const userFriendlyMessage =
          errorMessages[error.code] ||
          "An error occurred. Please try again later.";
        return { success: false, message: userFriendlyMessage };
      }

      console.error("Unexpected error during login:", error);
      return {
        success: false,
        message: "Something went wrong. Please try again later.",
      };
    }
  };

  const register = async (
    email: string,
    password: string,
    username: string | null = null,
    firstName: string | null = null,
    lastName: string | null = null,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const { user } = userCredential;

      if (!user) {
        return { success: false, message: "Failed to create user." };
      }

      await sendEmailVerification(user);

      const hashedPassword = bcrypt.hashSync(password, 10);
      await storeUser({
        firebaseUid: user.uid,
        email,
        hashedPassword,
        username,
        firstName,
        lastName,
      });

      return {
        success: true,
        message:
          "User registered successfully. Please check your email for verification.",
      };
    } catch (error: unknown) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case "auth/email-already-in-use":
            return {
              success: false,
              message:
                "This email is already registered. Please log in or reset your password.",
            };
          case "auth/weak-password":
            return {
              success: false,
              message:
                "Your password is too weak. Please use at least 8 characters.",
            };
          case "auth/invalid-email":
            return {
              success: false,
              message:
                "The email address provided is invalid. Please use a valid email.",
            };
          default:
            return {
              success: false,
              message:
                "An error occurred during registration. Please try again later.",
            };
        }
      }

      console.error("Registration error:", error);
      return {
        success: false,
        message:
          "An unexpected error occurred during registration. Please try again later.",
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const resetPassword = async (
    email: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: "Password reset email sent successfully.",
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof FirebaseError
          ? error.message
          : "Failed to send password reset email.";
      return { success: false, message: errorMessage };
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        userMetadata,
        setUser,
        setUserMetadata,
        isAuthenticated,
        login,
        logout,
        resetPassword,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
