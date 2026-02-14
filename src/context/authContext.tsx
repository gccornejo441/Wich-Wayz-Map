import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { FirebaseError } from "firebase/app";
import { getMyUserMetadata } from "../services/apiClient";
import { SafeUserMetadata } from "@models/SafeUserMetadata";

/**
 * Backend user model - may contain sensitive fields
 * This type represents what the backend database stores, but we should
 * never persist this full object on the client side.
 * @deprecated For type safety only - use SafeUserMetadata for client state
 */
export interface UserMetadata {
  id: number;
  firebaseUid: string;
  email: string;
  hashedPassword?: string; // Backend only - never send to client
  username: string | null;
  usernameFinalizedAt?: string | null;
  verified: boolean;
  authProvider?: string;
  verificationToken?: string | null; // Backend only - never send to client
  modifiedBy?: string | null;
  dateCreated?: string;
  dateModified?: string;
  membershipStatus: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  accountStatus: string;
  lastLogin?: string | null;
  avatar: string | null;
  tokenExpiry?: string | null; // Deprecated - no longer used
  resetToken?: string | null; // Backend only - never send to client
}

/**
 * Maps backend user metadata to safe client metadata.
 * Only includes fields safe for client-side storage and display.
 */
export const toSafeUserMetadata = (
  metadata: UserMetadata,
): SafeUserMetadata => ({
  id: metadata.id,
  firebaseUid: metadata.firebaseUid,
  email: metadata.email,
  username: metadata.username,
  usernameFinalizedAt: metadata.usernameFinalizedAt ?? null,
  verified: metadata.verified,
  authProvider: metadata.authProvider || "password",
  firstName: metadata.firstName,
  lastName: metadata.lastName,
  role: metadata.role,
  membershipStatus: metadata.membershipStatus,
  accountStatus: metadata.accountStatus,
  avatar: metadata.avatar,
  dateCreated: metadata.dateCreated,
  lastLogin: metadata.lastLogin,
  // Explicitly exclude all sensitive fields:
  // hashedPassword, verificationToken, resetToken, tokenExpiry
});

interface AuthContextData {
  user: FirebaseUser | null;
  userMetadata: SafeUserMetadata | null;
  metadataError: string | null;
  isLoadingMetadata: boolean;
  setUser: React.Dispatch<React.SetStateAction<FirebaseUser | null>>;
  setUserMetadata: React.Dispatch<
    React.SetStateAction<SafeUserMetadata | null>
  >;
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
  signInWithGoogle: () => Promise<{ success: boolean; message: string }>;
  register: (
    email: string | null,
    password: string | null,
    useGoogle?: boolean,
  ) => Promise<{ success: boolean; message: string }>;
  retryFetchMetadata: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // Initialize from sessionStorage - only safe metadata
  const [userMetadata, setUserMetadata] = useState<SafeUserMetadata | null>(
    () => {
      const storedMetadata = sessionStorage.getItem("safeUserMetadata");
      return storedMetadata ? JSON.parse(storedMetadata) : null;
    },
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
      setUserMetadata(null);
      setMetadataError(null);
      setIsLoadingMetadata(false);
      // Clean up all auth-related storage keys
      sessionStorage.removeItem("safeUserMetadata");
      sessionStorage.removeItem("userMetadata"); // Legacy key
      sessionStorage.removeItem("token"); // Legacy key
      localStorage.removeItem("token"); // Legacy key
      localStorage.removeItem("refreshToken"); // Legacy key
      localStorage.removeItem("tokenExpiry"); // Legacy key
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, []);

  /**
   * Fetches user metadata with retry logic and exponential backoff.
   * Prevents split-brain state where user is authenticated but has no database record.
   */
  const fetchUserMetadataWithRetry = useCallback(
    async (maxRetries: number = 3): Promise<void> => {
      setIsLoadingMetadata(true);
      setMetadataError(null);

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const freshMetadata = await getMyUserMetadata();
          setUserMetadata(freshMetadata);
          sessionStorage.setItem(
            "safeUserMetadata",
            JSON.stringify(freshMetadata),
          );
          setMetadataError(null);
          setIsLoadingMetadata(false);
          return; // Success - exit retry loop
        } catch (error) {
          console.error(
            `Error fetching user metadata (attempt ${attempt}/${maxRetries}):`,
            error,
          );

          // If this was the last attempt, set error state
          if (attempt === maxRetries) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to load user profile. Please try again.";
            setMetadataError(errorMessage);
            setIsLoadingMetadata(false);
            return;
          }

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    },
    [],
  );

  /**
   * Manual retry function exposed to components for user-initiated recovery.
   */
  const retryFetchMetadata = useCallback(async (): Promise<void> => {
    if (!user) {
      setMetadataError("Please log in first.");
      return;
    }
    await fetchUserMetadataWithRetry(3);
  }, [user, fetchUserMetadataWithRetry]);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Load cached metadata immediately for better UX
        const cached = sessionStorage.getItem("safeUserMetadata");
        if (cached) {
          try {
            setUserMetadata(JSON.parse(cached));
          } catch (e) {
            console.error("Failed to parse cached metadata:", e);
          }
        }

        // Fetch fresh metadata with retry logic
        await fetchUserMetadataWithRetry(3);
      } else {
        setUserMetadata(null);
        setMetadataError(null);
        setIsLoadingMetadata(false);
        sessionStorage.removeItem("safeUserMetadata");
      }
    });

    return () => unsubscribe();
  }, [fetchUserMetadataWithRetry]);

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
      await signInWithEmailAndPassword(auth, email, password);

      return { success: true, message: "Login successful." };
    } catch (error: unknown) {
      if (error instanceof FirebaseError) {
        console.error("Firebase login error:", error.code);

        const errorMessages: Record<string, string> = {
          "auth/user-not-found": "No account found with this email.",
          "auth/wrong-password": "Incorrect password.",
          "auth/too-many-requests":
            "Too many failed attempts. Please try again later.",
          "auth/network-request-failed":
            "Network error. Check your connection.",
          "auth/invalid-email": "Invalid email or password",
          "auth/invalid-credential": "Invalid email or password",
        };

        return {
          success: false,
          message:
            errorMessages[error.code] || "Login failed. Please try again.",
        };
      }

      console.error("Unexpected error during login:", error);
      return {
        success: false,
        message: "Something went wrong. Please try again later.",
      };
    }
  };

  const register = async (
    email: string | null,
    password: string | null,
    useGoogle: boolean = false,
  ): Promise<{ success: boolean; message: string }> => {
    if (useGoogle) {
      return signInWithGoogle();
    }

    try {
      if (!email || email.trim() === "") {
        throw new Error("Email is required and cannot be empty.");
      }
      if (!password || password.trim() === "") {
        throw new Error("Password is required and cannot be empty.");
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (!user) {
        throw new Error("Failed to create user.");
      }

      await sendEmailVerification(user);

      return {
        success: true,
        message: "Registration successful! Check your email to verify.",
      };
    } catch (error: unknown) {
      console.error("Error during registration:", error);

      if (error instanceof FirebaseError) {
        const errorMessages: Record<string, string> = {
          "auth/email-already-in-use":
            "This email is already registered. Please sign in or use a different email.",
          "auth/invalid-email": "Please enter a valid email address.",
          "auth/weak-password": "Password must be at least 6 characters long.",
          "auth/network-request-failed":
            "Network error. Please check your connection and try again.",
          "auth/too-many-requests":
            "Too many attempts. Please try again later.",
        };

        return {
          success: false,
          message:
            errorMessages[error.code] ||
            "Registration failed. Please try again.",
        };
      }

      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      return { success: false, message };
    }
  };

  const signInWithGoogle = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection every time - prevents auto-login with cached account
      provider.setCustomParameters({
        prompt: "select_account",
      });
      await signInWithPopup(auth, provider);

      return { success: true, message: "Google sign-in successful" };
    } catch (error: unknown) {
      if (error instanceof FirebaseError) {
        const errorMessages: Record<string, string> = {
          "auth/popup-closed-by-user": "Sign-in canceled",
          "auth/cancelled-popup-request": "Another sign-in ongoing",
        };

        return {
          success: false,
          message: errorMessages[error.code] || "Sign-in failed",
        };
      }

      return { success: false, message: "Sign-in failed" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userMetadata,
        metadataError,
        isLoadingMetadata,
        setUser,
        setUserMetadata,
        isAuthenticated: !!user,
        login,
        signInWithGoogle,
        logout,
        resetPassword: async (email) => {
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
        },
        register,
        retryFetchMetadata,
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
