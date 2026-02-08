import { withRole } from "../lib/withAuth.js";
import { getTursoClient } from "../lib/turso.js";

const toSafeUserMetadata = (user) => ({
  id: user.id,
  firebaseUid: user.firebase_uid,
  email: user.email,
  username: user.username,
  verified: Boolean(user.verified),
  firstName: user.first_name,
  lastName: user.last_name,
  role: user.role,
  membershipStatus: user.membership_status,
  accountStatus: user.account_status,
  avatar: user.avatar,
  authProvider: user.auth_provider || "password",
  dateCreated: user.date_created,
  lastLogin: user.last_login,
});

async function handler(req, res) {
  const turso = await getTursoClient();

  if (req.method === "GET") {
    try {
      const result = await turso.execute("SELECT * FROM users");
      const safeUsers = result.rows.map(toSafeUserMetadata);
      return res.status(200).json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  }

  if (req.method === "POST") {
    const {
      firebaseUid,
      email,
      username,
      firstName = null,
      lastName = null,
      role = "user",
      membershipStatus = "basic",
      accountStatus = "active",
      avatar = null,
      authProvider = "password",
    } = req.body || {};

    // SECURITY: Never trust 'verified' from client - always set to 0 for manual user creation
    // Only Firebase OAuth flow in users/me.js should set verified=1 based on emailVerified
    const verified = 0;

    if (!firebaseUid || !email || !username) {
      return res.status(400).json({
        message: "Missing required fields: firebaseUid, email, username",
      });
    }

    try {
      await turso.execute({
        sql: `INSERT INTO users (
          firebase_uid, email, username, 
          first_name, last_name, role, verified, auth_provider,
          membership_status, account_status, avatar
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          firebaseUid,
          email,
          username,
          firstName,
          lastName,
          role,
          verified,
          authProvider,
          membershipStatus,
          accountStatus,
          avatar,
        ],
      });

      const result = await turso.execute({
        sql: "SELECT * FROM users WHERE firebase_uid = ? LIMIT 1",
        args: [firebaseUid],
      });

      const safeUser = result.rows[0]
        ? toSafeUserMetadata(result.rows[0])
        : null;
      return res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);

      if (error.message?.includes("UNIQUE constraint")) {
        return res.status(409).json({ message: "User already exists" });
      }

      return res.status(500).json({ message: "Failed to create user" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}

export default async function wrappedHandler(req, res) {
  if (req.method === "GET") {
    return withRole(["admin"])(handler)(req, res);
  }
  return handler(req, res);
}
