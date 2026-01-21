import { executeQuery } from "../../lib/db.js";

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

    // Transform snake_case to camelCase for frontend
    const user = rows[0];
    const transformedUser = {
      id: user.id,
      firebaseUid: user.firebase_uid,
      email: user.email,
      hashedPassword: user.hashed_password,
      username: user.username,
      verified: user.verified,
      verificationToken: user.verification_token,
      modifiedBy: user.modified_by,
      dateCreated: user.date_created,
      dateModified: user.date_modified,
      membershipStatus: user.membership_status,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      accountStatus: user.account_status,
      lastLogin: user.last_login,
      avatar: user.avatar,
      tokenExpiry: user.token_expiry,
      resetToken: user.reset_token,
    };

    res.status(200).json(transformedUser);
  } catch (error) {
    console.error("Failed to fetch user by firebase uid:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}
