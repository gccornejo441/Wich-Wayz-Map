import { apiRequest } from "./apiClient";
import { getUserMetadataByFirebaseUid } from "./apiClient";
import { auth } from "./firebase";

/**
 * Gets the current authenticated user's information from Firebase and the database.
 * @param logout - Function to call if user needs to be logged out due to auth issues
 * @returns User information including sub (user ID), membershipStatus, and email, or null if not authenticated
 */
export const getCurrentUser = async (
  logout: () => Promise<void>,
): Promise<{
  sub: string;
  membershipStatus: string;
  email: string;
} | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    // Get user metadata from database
    const userMetadata = await getUserMetadataByFirebaseUid(currentUser.uid);
    if (!userMetadata) {
      console.error("User metadata not found in database");
      await logout();
      return null;
    }

    return {
      sub: userMetadata.id.toString(),
      membershipStatus: userMetadata.membershipStatus,
      email: currentUser.email || "",
    };
  } catch (error) {
    console.error("Error getting current user:", error);
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
