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
 * Decodes the given JWT token and returns the payload. If the token has expired,
 * the function will attempt to refresh the token using the given refresh token.
 * If the token cannot be refreshed, the function will return null.
 * @param token The JWT token to decode.
 * @param refreshToken The refresh token to use if the JWT token has expired.
 * @returns The decoded payload of the JWT token, or null if the token cannot be decoded or refreshed.
 */
export const decodeJwtWithRefresh = async (
  token: string,
  refreshToken: string,
): Promise<TokenPayload | null> => {
  try {
    // Decode the JWT
    const { payload }: { payload: TokenPayload } = await jwtVerify(
      token,
      SECRET_KEY,
    );

    // Check if the token has expired
    if (payload.exp === undefined) {
      throw new Error("Token does not have an exp claim.");
    }

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
 * Initializes and generates JWT and refresh tokens for a user.
 *
 * @param userMetadata - The metadata of the user for whom the tokens are generated.
 * @returns The generated access token as a string, or an error object containing
 *          a status, user, and message if token generation fails.
 */
export const initializeJWT = async (
  userMetadata: UserMetadata,
): Promise<string | { status: string; user: null; message: string }> => {
  try {
    // Generate JWT
    const accessToken = await generateJWT(userMetadata);
    // Generate refresh token
    const refreshToken = await generateRefreshToken(userMetadata);

    // Store tokens in local storage
    if (accessToken && refreshToken) {
      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
    }

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
 * Refreshes the access token using the provided refresh token.
 *
 * @param refreshToken - The refresh token used to generate a new access token.
 * @returns A Promise that resolves to the new access token as a string, or null if the token cannot be refreshed.
 */
const refreshAccessToken = async (
  refreshToken: string,
): Promise<string | null> => {
  try {
    // Decode the JWT
    const { payload }: { payload: TokenPayload } = await jwtVerify(
      refreshToken,
      SECRET_KEY,
    );

    // Generate a new access token
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
 * Resets the user's password using the verification token from the reset password email
 * and the new password.
 * @param tokenFromEmail The verification token from the reset password email.
 * @param password The new password to set.
 * @returns A promise that resolves to an object containing a success flag and a message.
 */
export const resetPassword = async (
  tokenFromEmail: string,
  password: string,
): Promise<{ success: boolean; message: string }> => {
  // Check if token and password are provided
  if (!tokenFromEmail || !password) {
    return {
      success: false,
      message: "Token and password are required.",
    };
  }

  try {
    // Update the hashed password in the database where the verification token matches
    const query = `UPDATE users SET hashed_password = $hashed_password WHERE verification_token = $tokenFromEmail`;

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);

    await executeQuery(query, {
      hashed_password: hashedPassword,
      tokenFromEmail,
    });

    return { success: true, message: "Password reset successful." };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

/**
 * Generates a refresh token for the given user.
 * The generated token is signed with the HS256 algorithm and expires in 7 days.
 * The payload of the token contains the user's ID, email, role, and membership status.
 * @param user of type UserMetadata
 * @returns A string representing the generated refresh token.
 */
export const generateRefreshToken = async (
  user: UserMetadata,
): Promise<string> => {
  // Generate refresh token
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
 * Generates a JWT for the given user metadata.
 * The generated token is signed with the HS256 algorithm and expires in 7 days.
 * The payload of the token contains the user's ID, email, role, and membership status.
 * @param user of type UserMetadata
 * @returns A string representing the generated JWT.
 */
export const generateJWT = async (user: UserMetadata): Promise<string> => {
  // Generate JWT
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
