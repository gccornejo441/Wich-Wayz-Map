import { apiRequest } from "./apiClient";

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
    await apiRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ tokenFromEmail, password }),
    });

    return { success: true, message: "Password reset successful." };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};