import { verifyFirebaseToken } from "./firebaseAdmin.js";

/**
 * Extracts and verifies authentication from the request.
 * Now exclusively uses Firebase ID tokens via Authorization header.
 * 
 * @param {Object} req - Express request object
 * @returns {Promise<{firebaseUid: string|null, email: string|null}>}
 */
export const extractAuthUser = async (req) => {
  const authHeader =
    req.headers?.authorization || req.headers?.Authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return { firebaseUid: null, email: null };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { firebaseUid: null, email: null };
  }

  // Verify Firebase ID token
  const decoded = await verifyFirebaseToken(token);
  if (!decoded) {
    return { firebaseUid: null, email: null };
  }

  return {
    firebaseUid: decoded.uid,
    email: decoded.email,
  };
};

export default extractAuthUser;