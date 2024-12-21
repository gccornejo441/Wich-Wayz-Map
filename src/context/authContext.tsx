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
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { FirebaseError } from "firebase/app";
import bcrypt from "bcryptjs";
import { getUserMetadataByFirebaseUid, storeUser } from "../services/apiClient";
import { initializeJWT } from "../services/security";

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

export interface SessionUserMetadata {
  id: number;
  firebaseUid: string;
  email: string;
  username: string | null;
  verified: boolean;
  verificationToken: string | null;
  dateModified: string;
  membershipStatus: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  accountStatus: string;
  avatar: string | null;
  tokenExpiry: string | null;
  resetToken: string | null;
}

/**
 * Utility function to map full UserMetadata to SessionUserMetadata.
 */
export const mapToSessionUserMetadata = (
  metadata: UserMetadata,
): SessionUserMetadata => ({
  id: metadata.id,
  firebaseUid: metadata.firebaseUid,
  email: metadata.email,
  username: metadata.username,
  verified: metadata.verified,
  dateModified: metadata.dateModified,
  membershipStatus: metadata.membershipStatus,
  firstName: metadata.firstName,
  lastName: metadata.lastName,
  role: metadata.role,
  accountStatus: metadata.accountStatus,
  avatar: metadata.avatar,
  verificationToken: metadata.verificationToken,
  tokenExpiry: metadata.tokenExpiry,
  resetToken: metadata.resetToken,
});

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
  signInWithGoogle: () => Promise<{ success: boolean; message: string }>;
  refreshToken: () => Promise<string | null>;
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

  // Initialize userMetadata.tokenExpiry from localStorage
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(() => {
    const storedMetadata = sessionStorage.getItem("userMetadata");
    const metadata = storedMetadata ? JSON.parse(storedMetadata) : null;

    if (metadata) {
      const tokenExpiry = localStorage.getItem("tokenExpiry");
      if (tokenExpiry) {
        metadata.tokenExpiry = tokenExpiry;
      } else {
        console.warn(
          "Token expiry missing in localStorage during initialization.",
        );
      }
    }

    return metadata;
  });

  useEffect(() => {
    const refreshAuthToken = async () => {
      if (!user || !userMetadata) {
        return;
      }

      const tokenExpiry =
        userMetadata.tokenExpiry || localStorage.getItem("tokenExpiry");
      if (!tokenExpiry) {
        return;
      }

      const expiryTime = new Date(tokenExpiry).getTime();
      const now = Date.now();

      if (expiryTime - now <= 60000) {
        await refreshToken();
      }
    };

    const interval = setInterval(() => {
      refreshAuthToken();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [user, userMetadata]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        if (!sessionStorage.getItem("userMetadata")) {
          try {
            const metadata = await getUserMetadataByFirebaseUid(
              firebaseUser.uid,
            );
            if (metadata) {
              const sessionMetadata = mapToSessionUserMetadata(metadata);
              setUserMetadata(metadata);
              sessionStorage.setItem(
                "userMetadata",
                JSON.stringify(sessionMetadata),
              );
            }
          } catch (error) {
            console.error("Error fetching user metadata:", error);
            setUserMetadata(null);
            sessionStorage.removeItem("userMetadata");
          }
        }
      } else {
        setUserMetadata(null);
        sessionStorage.removeItem("userMetadata");
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

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const { user } = userCredential;

      if (!user) {
        return { success: false, message: "Failed to authenticate user." };
      }

      const metadata = await getUserMetadataByFirebaseUid(user.uid);
      if (metadata) {
        const sessionMetadata = mapToSessionUserMetadata(metadata);

        const tokenExpiryTime = Date.now() + 3600 * 1000;
        sessionMetadata.tokenExpiry = new Date(tokenExpiryTime).toISOString();
        metadata.tokenExpiry = sessionMetadata.tokenExpiry;

        setUserMetadata(metadata);
        sessionStorage.setItem("userMetadata", JSON.stringify(sessionMetadata));
        localStorage.setItem("tokenExpiry", sessionMetadata.tokenExpiry);

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

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
      setUserMetadata(null);
      sessionStorage.removeItem("userMetadata");
    } catch (error) {
      console.error("Error during logout:", error);
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

      const sessionMetadata = mapToSessionUserMetadata(metadata);

      const tokenExpiryTime = Date.now() + 3600 * 1000;
      sessionMetadata.tokenExpiry = new Date(tokenExpiryTime).toISOString();
      metadata.tokenExpiry = sessionMetadata.tokenExpiry;

      setUserMetadata(metadata);
      sessionStorage.setItem("userMetadata", JSON.stringify(sessionMetadata));
      localStorage.setItem("tokenExpiry", sessionMetadata.tokenExpiry);

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

  const refreshToken = async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const token = await user.getIdToken(true);
      const tokenExpiryTime = Date.now() + 3600 * 1000;

      if (!userMetadata) return null;

      const updatedMetadata: UserMetadata = {
        ...userMetadata,
        tokenExpiry: new Date(tokenExpiryTime).toISOString(),
        id: userMetadata.id || 0,
      };

      setUserMetadata(updatedMetadata);
      sessionStorage.setItem("userMetadata", JSON.stringify(updatedMetadata));

      if (updatedMetadata.tokenExpiry) {
        localStorage.setItem("tokenExpiry", updatedMetadata.tokenExpiry);
      } else {
        console.error("Token expiry is null; cannot set in localStorage.");
      }
      sessionStorage.setItem("token", token);

      return token;
    } catch (error) {
      console.error("Error refreshing token:", error);
      logout();
      return null;
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
        refreshToken,
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
