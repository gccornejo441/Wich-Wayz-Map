import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
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
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { FirebaseError } from "firebase/app";
import bcrypt from "bcryptjs";
import { getUserMetadataByFirebaseUid, storeUser } from "../services/apiClient";
import { SafeUserMetadata } from "@models/SafeUserMetadata";
import { initializeJWT } from "../services/security";

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
  verified: boolean;
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
  verified: metadata.verified,
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
    username?: string | null,
    firstName?: string | null,
    lastName?: string | null,
    useGoogle?: boolean,
  ) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Only fetch if we don't have metadata in storage
        if (!sessionStorage.getItem("safeUserMetadata")) {
          try {
            const metadata = await getUserMetadataByFirebaseUid(
              firebaseUser.uid,
            );
            if (metadata) {
              const safeMetadata = toSafeUserMetadata(metadata);
              setUserMetadata(safeMetadata);
              sessionStorage.setItem(
                "safeUserMetadata",
                JSON.stringify(safeMetadata),
              );
            }
          } catch (error) {
            console.error("Error fetching user metadata:", error);
            setUserMetadata(null);
            sessionStorage.removeItem("safeUserMetadata");
          }
        }
      } else {
        setUserMetadata(null);
        sessionStorage.removeItem("safeUserMetadata");
      }
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

      // Sign in with email and password using the firebase api
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Get the firebase user
      const { user } = userCredential;

      // Check if the user exists
      if (!user) {
        return { success: false, message: "Failed to authenticate user." };
      }

      // Get the user metadata
      const metadata = await getUserMetadataByFirebaseUid(user.uid);

      if (metadata) {
        // Map to safe metadata (removes sensitive fields)
        const safeMetadata = toSafeUserMetadata(metadata);

        setUserMetadata(safeMetadata);

        // Store only safe metadata in session storage
        sessionStorage.setItem(
          "safeUserMetadata",
          JSON.stringify(safeMetadata),
        );

        // Keep initializeJWT for now (will be removed in PR6)
        const jwtResult = await initializeJWT(metadata);
        if (typeof jwtResult !== "string") {
          return {
            success: false,
            message: jwtResult.message || "Failed to generate session token.",
          };
        }
      }

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
          "auth/invalid-email": "Invalid email or password",
          "auth/invalid-credential": "Invalid email or password",
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

  const registerWithGoogle = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user || !user.email) {
        throw new Error("Google sign-in failed. Email is required.");
      }

      const email = user.email.trim();
      const username = email.split("@")[0];

      if (!user.uid) {
        throw new Error("Firebase UID is required and cannot be empty.");
      }

      await storeUser({
        firebaseUid: user.uid,
        email,
        hashedPassword: "",
        username: username.trim(),
        membershipStatus: "basic",
        firstName: null,
        lastName: "",
      });

      return { success: true, message: "Google sign-in successful." };
    } catch (error: unknown) {
      console.error("Error during Google sign-in:", error);
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      return { success: false, message };
    }
  };

  const register = async (
    email: string | null,
    password: string | null,
    username: string | null = null,
    firstName: string | null = null,
    lastName: string | null = null,
    useGoogle: boolean = false,
  ): Promise<{ success: boolean; message: string }> => {
    if (useGoogle) {
      return registerWithGoogle();
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

      const hashedPassword = bcrypt.hashSync(password, 10);
      const autoUsername = username || email.split("@")[0];

      await storeUser({
        firebaseUid: user.uid,
        email: email.trim(),
        hashedPassword,
        username: autoUsername.trim(),
        membershipStatus: "basic",
        firstName,
        lastName,
      });

      return {
        success: true,
        message: "User registered successfully. Please check your email.",
      };
    } catch (error: unknown) {
      console.error("Error during registration:", error);
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

      const result = await signInWithPopup(auth, provider);

      const user = result.user;

      if (!user || !user.email) {
        throw new Error("Google sign-in failed. Email is required.");
      }

      if (!user.uid) {
        throw new Error("Firebase UID is required and cannot be empty.");
      }

      const metadata = await getUserMetadataByFirebaseUid(user.uid);
      if (!metadata) {
        throw new Error(
          "No account found for this Google account. Please register first.",
        );
      }

      // Map to safe metadata (removes sensitive fields)
      const safeMetadata = toSafeUserMetadata(metadata);

      setUserMetadata(safeMetadata);
      sessionStorage.setItem("safeUserMetadata", JSON.stringify(safeMetadata));

      // Keep initializeJWT for now (will be removed in PR6)
      const jwtResult = await initializeJWT(metadata);
      if (typeof jwtResult !== "string") {
        return {
          success: false,
          message: jwtResult.message || "Failed to generate session token.",
        };
      }

      return { success: true, message: "Google sign-in successful." };
    } catch (error: unknown) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case "auth/popup-closed-by-user":
            return {
              success: false,
              message: "Sign-in process was canceled. Please try again.",
            };
          case "auth/cancelled-popup-request":
            return {
              success: false,
              message: "Another sign-in process is ongoing. Please wait.",
            };
          default:
            return {
              success: false,
              message: "An error occurred during sign-in. Please try again.",
            };
        }
      }

      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.";
      return { success: false, message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userMetadata,
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
