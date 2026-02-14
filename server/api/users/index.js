import { withRole } from "../lib/withAuth.js";
import { getTursoClient } from "../lib/turso.js";
import { getUsersTableCapabilities } from "../lib/usersTable.js";
import { reserveUniqueGeneratedUsername } from "../lib/usernameReservation.js";

const toSafeUserMetadata = (user) => ({
  id: user.id,
  firebaseUid: user.firebase_uid,
  email: user.email,
  username: user.username,
  usernameFinalizedAt: user.username_finalized_at ?? null,
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
  const usersTable = await getUsersTableCapabilities(turso);

  if (req.method === "GET") {
    try {
      const deletedFilter = usersTable.hasDeletedAt
        ? " WHERE deleted_at IS NULL"
        : "";
      const result = await turso.execute(`SELECT * FROM users${deletedFilter}`);
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
      firstName = null,
      lastName = null,
      role = "member",
      membershipStatus = "unverified",
      accountStatus = "active",
      avatar = null,
      authProvider = "password",
    } = req.body || {};

    const verified = 0;

    if (!firebaseUid || !email) {
      return res.status(400).json({
        message: "Missing required fields: firebaseUid, email",
      });
    }

    try {
      const insertColumns = [
        "firebase_uid",
        "email",
        "username",
        "first_name",
        "last_name",
        "role",
        "verified",
        "membership_status",
        "account_status",
        "avatar",
      ];

      const insertArgs = [
        firebaseUid,
        email,
        null,
        firstName,
        lastName,
        role,
        verified,
        membershipStatus,
        accountStatus,
        avatar,
      ];

      if (usersTable.hasAuthProvider) {
        insertColumns.push("auth_provider");
        insertArgs.push(authProvider);
      }

      if (usersTable.hashedPasswordRequired) {
        insertColumns.push("hashed_password");
        insertArgs.push(`firebase-auth-${firebaseUid}-${Date.now()}`);
      }

      const placeholders = insertColumns.map(() => "?").join(", ");

      await reserveUniqueGeneratedUsername(async (username) => {
        const args = [...insertArgs];
        args[2] = username;

        await turso.execute({
          sql: `INSERT INTO users (${insertColumns.join(", ")}) VALUES (${placeholders})`,
          args,
        });
      });

      const deletedFilter = usersTable.hasDeletedAt
        ? " AND deleted_at IS NULL"
        : "";
      const result = await turso.execute({
        sql: `SELECT * FROM users WHERE firebase_uid = ?${deletedFilter} LIMIT 1`,
        args: [firebaseUid],
      });

      const safeUser = result.rows[0]
        ? toSafeUserMetadata(result.rows[0])
        : null;
      return res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);

      if (error?.message?.includes("UNIQUE constraint")) {
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
