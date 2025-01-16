import { executeQuery } from "./apiClient";
import bcrypt from "bcryptjs";
import { SignJWT, decodeJwt, jwtVerify } from "jose";
import { UserMetadata } from "../context/authContext";

const SECRET_KEY = new TextEncoder().encode(
  import.meta.env.VITE_JWT_SECRET as string,
);

interface TokenPayload {
  sub?: string;
  email?: string;
  role?: string;
  username?: string | null;
  verified?: boolean;
  membershipStatus?: string;
  exp?: number;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  verification_token?: string | null;
  account_status?: string;
  last_login?: string | null;
}

/**
 * Decodes JWT and extracts user metadata.
 */
export const decodeJwtWithRefresh = async (
  token: string,
  refreshToken: string,
): Promise<TokenPayload | null> => {
  try {
    const { payload }: { payload: TokenPayload } = await jwtVerify(
      token,
      SECRET_KEY,
    );

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "JWTExpired") {
      console.warn("Token expired. Attempting to refresh...");

      const newAccessToken = await refreshAccessToken(refreshToken);
      if (newAccessToken) {
        localStorage.setItem("token", newAccessToken);

        const newPayload = await decodeJwt(newAccessToken);
        return newPayload;
      } else {
        console.error("Unable to refresh token. User must log in again.");
        return null;
      }
    }

    console.error("Error decoding JWT:", error);
    return null;
  }
};

/**
 * Generates a JWT for the given user metadata and stores it in local storage.
 */
export const initializeJWT = async (
  userMetadata: UserMetadata,
): Promise<string | { status: string; user: null; message: string }> => {
  try {
    const accessToken = await generateJWT(userMetadata);
    const refreshToken = await generateRefreshToken(userMetadata);

    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    return accessToken;
  } catch (error) {
    console.error("Error generating JWT:", error);
    return {
      status: "error",
      user: null,
      message: "An unexpected error occurred.",
    };
  }
};

/**
 * Function to refresh the access token using the refresh token.
 */
const refreshAccessToken = async (
  refreshToken: string,
): Promise<string | null> => {
  try {
    const { payload }: { payload: TokenPayload } = await jwtVerify(
      refreshToken,
      SECRET_KEY,
    );

    const newAccessToken = await generateJWT(payload as UserMetadata);
    return newAccessToken;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to refresh access token:", error.message);
    } else {
      console.error("Unexpected error while refreshing access token:", error);
    }
    return null;
  }
};

/**
 * Resets a user's password.
 */
export const resetPassword = async (
  token: string,
  password: string,
): Promise<{ success: boolean; message: string }> => {
  if (!token || !password) {
    return {
      success: false,
      message: "Token and password are required.",
    };
  }

  try {
    const query = `UPDATE users SET hashed_password = $hashed_password WHERE verification_token = $token`;
    const hashedPassword = bcrypt.hashSync(password, 10);
    await executeQuery(query, { hashed_password: hashedPassword, token });
    return { success: true, message: "Password reset successful." };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

/**
 * Generates a refresh token for a user.
 */
export const generateRefreshToken = async (
  user: UserMetadata,
): Promise<string> => {
  const refreshToken = await new SignJWT({
    sub: user.id.toString(),
    email: user.email,
    role: user.role,
    membershipStatus: user.membershipStatus,
    username: user.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET_KEY);

  return refreshToken;
};

/**
 * Generates a JWT for a user.
 */
export const generateJWT = async (user: UserMetadata): Promise<string> => {
  const token = await new SignJWT({
    sub: user.id.toString(),
    email: user.email,
    role: user.role,
    membershipStatus: user.membershipStatus,
    username: user.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET_KEY);

  return token;
};

/**
 * Determines if a token is about to expire within a specified buffer time.
 */
const isTokenExpiredSoon = (exp: number): boolean => {
  const currentTime = Math.floor(Date.now() / 1000);
  const bufferTime = 60;
  return exp < currentTime + bufferTime;
};

/**
 * Retrieves the currently logged in user.
 *
 * This function verifies the JWT stored in local storage. If the token is
 * invalid or expired, it will attempt to refresh the token using the
 * refresh token stored in local storage. If the token cannot be refreshed,
 * the user will be logged out.
 */
export const getCurrentUser = async (
  logout: () => Promise<void>,
): Promise<TokenPayload | null> => {
  let token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refreshToken");

  if (!token || !refreshToken) {
    await logout();
    return null;
  }

  try {
    const { payload }: { payload: TokenPayload } = await jwtVerify(
      token,
      SECRET_KEY,
    );

    if (payload.exp === undefined) {
      throw new Error("Token does not have an exp claim.");
    }

    if (isTokenExpiredSoon(payload.exp)) {
      console.warn("Token nearing expiration. Refreshing...");
      token = await refreshAccessToken(refreshToken);

      if (!token) {
        console.error("Unable to refresh token. User must log in again.");
        logout();
        return null;
      }

      localStorage.setItem("token", token);
    }

    return payload;
  } catch (error) {
    console.warn("Token verification failed. Attempting forced refresh...");

    const newAccessToken = await refreshAccessToken(refreshToken);
    if (newAccessToken) {
      localStorage.setItem("token", newAccessToken);

      const { payload } = await jwtVerify(newAccessToken, SECRET_KEY);
      return payload;
    } else {
      console.error("Unable to refresh token. User must log in again.", error);
      logout();
      return null;
    }
  }
};
