import { executeQuery } from "../lib/db.js";

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
  if (req.method === "GET") {
    try {
      const rows = await executeQuery("SELECT * FROM users");
      // Return safe metadata for all users
      const safeUsers = rows.map(toSafeUserMetadata);
      res.status(200).json(safeUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
    return;
  }

  if (req.method === "POST") {
    const {
      firebaseUid,
      email,
      hashedPassword,
      username,
      membershipStatus,
      firstName,
      lastName,
    } = req.body || {};

    if (!firebaseUid || !email || !hashedPassword || !username) {
      res.status(400).json({ message: "Missing required user fields" });
      return;
    }

    try {
      await executeQuery(
        `
          INSERT INTO users (
            firebase_uid,
            email,
            hashed_password,
            username,
            membership_status,
            first_name,
            last_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          firebaseUid,
          email,
          hashedPassword,
          username,
          membershipStatus ?? "member",
          firstName ?? null,
          lastName ?? null,
        ],
      );

      const rows = await executeQuery(
        "SELECT * FROM users WHERE firebase_uid = ? LIMIT 1",
        [firebaseUid],
      );

      // Return safe metadata (no sensitive fields)
      const safeUser = rows[0] ? toSafeUserMetadata(rows[0]) : null;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
    return;
  }

  res.status(405).json({ message: "Method Not Allowed" });
}
