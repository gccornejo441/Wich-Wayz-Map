import { executeQuery } from "../../lib/db.js";

/**
 * Returns a safe projection of user metadata without sensitive fields
 * @param {Object} user - Raw user object from database
 * @returns {Object} Safe user metadata for client consumption
 */
const toSafeUserMetadata = (user) => {
  return {
    id: user.id,
    firebaseUid: user.firebase_uid,
    email: user.email,
    username: user.username,
    verified: user.verified,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    membershipStatus: user.membership_status,
    accountStatus: user.account_status,
    avatar: user.avatar,
    dateCreated: user.date_created,
    lastLogin: user.last_login,
    // Explicitly exclude: hashed_password, verification_token, reset_token, token_expiry
  };
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const { firebaseUid } = req.query;

  if (!firebaseUid || typeof firebaseUid !== "string") {
    res.status(400).json({ message: "Invalid firebaseUid" });
    return;
  }

  try {
    const rows = await executeQuery(
      "SELECT * FROM users WHERE firebase_uid = ?",
      [firebaseUid],
    );

    if (!rows.length) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Return only safe metadata (no sensitive fields)
    const safeUser = toSafeUserMetadata(rows[0]);
    res.status(200).json(safeUser);
  } catch (error) {
    console.error("Failed to fetch user by firebase uid:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}
