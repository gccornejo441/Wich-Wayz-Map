import { auth } from "./firebase";

/**
 * Fetches the current Firebase ID token just-in-time.
 * This token is used for API authorization and is never stored.
 * Firebase handles token refresh automatically.
 * 
 * @param forceRefresh - If true, forces token refresh even if not expired
 * @returns Firebase ID token or null if user not authenticated
 */
export const getFirebaseIdToken = async (
  forceRefresh: boolean = false,
): Promise<string | null> => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.warn("No authenticated Firebase user");
    return null;
  }

  try {
    // Firebase automatically refreshes expired tokens
    const token = await currentUser.getIdToken(forceRefresh);
    return token;
  } catch (error) {
    console.error("Failed to get Firebase ID token:", error);
    return null;
  }
};