import { executeQuery } from "./apiClient";
import bcrypt from "bcryptjs";
import { JWTPayload, SignJWT, jwtVerify } from "jose";
import { User } from "./api";

const SECRET_KEY = new TextEncoder().encode(
  import.meta.env.VITE_JWT_SECRET as string,
);

interface LoginSuccess {
  status: "success";
  user: User;
  token: string;
  message: string;
}

interface LoginError {
  status: "error";
  user: null;
  message: string;
}

type LoginResponse = LoginSuccess | LoginError;

/**
 * Decodes JWT and extracts user data.
 */
export const decodeJwt = async (token: string): Promise<User | null> => {
  try {
    const { payload }: { payload: JWTPayload } = await jwtVerify(
      token,
      SECRET_KEY,
    );

    const user: User = {
      id: payload.sub ? parseInt(payload.sub, 10) : undefined,
      email: payload.email as string,
      role: payload.role as string,
      username: payload.username as string,
      avatar: payload.avatar as string,
      verified: payload.verified as boolean,
      account_status: payload.account_status as string,
      membership_status: payload.membership_status as string,
      last_login: payload.last_login as string,
      first_name: payload.first_name as string,
      last_name: payload.last_name as string,
      verification_token: (payload.verification_token as string) || "",
      token_expiry: (payload.token_expiry as string) || "",
    };

    return user;
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

/**
 * Logs in the user with email and password, and stores the JWT in localStorage.
 */
export const loginUser = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  try {
    const query = `SELECT * FROM users WHERE email = $email`;
    const { rows } = await executeQuery<User>(query, { email });

    if (rows.length === 0) {
      return {
        status: "error",
        user: null,
        message: "Invalid email or password. Please try again.",
      };
    }

    const user = rows[0];

    if (!user.hashed_password) {
      return {
        status: "error",
        user: null,
        message: "Invalid email or password. Please try again.",
      };
    }

    const isPasswordValid = bcrypt.compareSync(password, user.hashed_password);

    if (!isPasswordValid) {
      return {
        status: "error",
        user: null,
        message: "Invalid email or password. Please try again.",
      };
    }

    const token = await generateJWT(user);
    localStorage.setItem("token", token);

    return {
      status: "success",
      user,
      token,
      message: "Login successful",
    };
  } catch (error) {
    console.error("Error logging in user:", error);
    return {
      status: "error",
      user: null,
      message: "An unexpected error occurred.",
    };
  }
};

/**
 * Resets a user's password.
 *
 * @param {string} token - The password reset token from the email.
 * @param {string} password - The new password.
 * @returns {Promise<{ success: boolean, message: string }>} - A promise containing the result of the request.
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
    // Use bcryptjs for hashing
    const hashedPassword = bcrypt.hashSync(password, 10);
    await executeQuery(query, { hashed_password: hashedPassword, token });
    return { success: true, message: "Password reset successful." };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

/**
 * Generates a JWT for a user.
 */
export const generateJWT = async (user: User): Promise<string> => {
  const token = await new SignJWT({
    sub: user.id?.toString(),
    email: user.email,
    role: user.role,
    membership_status: user.membership_status,
    username: user.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(SECRET_KEY);

  return token;
};

/**
 * Retrieves the current user from the decoded JWT.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const user = await decodeJwt(token);
    return user;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};
