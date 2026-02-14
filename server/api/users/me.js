import { withAuth } from "../lib/withAuth.js";
import { getTursoClient } from "../lib/turso.js";
import { getUsersTableCapabilities } from "../lib/usersTable.js";
import { reserveUniqueGeneratedUsername } from "../lib/usernameReservation.js";

const GOOGLE_SIGN_IN_PROVIDER = "google.com";

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

const isDeletedUser = (user, hasDeletedAt) => {
  const hasDeletedTimestamp =
    hasDeletedAt &&
    user.deleted_at !== null &&
    user.deleted_at !== undefined &&
    String(user.deleted_at).trim() !== "";
  return user.account_status === "deleted" || hasDeletedTimestamp;
};

const getActiveUserByFirebaseUid = async (turso, uid, hasDeletedAt) => {
  const deletedFilter = hasDeletedAt ? " AND deleted_at IS NULL" : "";
  return turso.execute({
    sql: `SELECT * FROM users WHERE firebase_uid = ?${deletedFilter} LIMIT 1`,
    args: [uid],
  });
};

const createFirebaseUser = async ({
  turso,
  usersTable,
  uid,
  email,
  verified,
  authProvider,
}) => {
  const insertColumns = [
    "firebase_uid",
    "email",
    "username",
    "role",
    "verified",
    "membership_status",
    "account_status",
  ];

  if (usersTable.hasAuthProvider) {
    insertColumns.push("auth_provider");
  }

  if (usersTable.hashedPasswordRequired) {
    insertColumns.push("hashed_password");
  }

  insertColumns.push("date_created", "date_modified", "last_login");

  await reserveUniqueGeneratedUsername(
    async (username) => {
      const insertArgs = [
        uid,
        email,
        username,
        "member",
        verified,
        "unverified",
        "active",
      ];

      if (usersTable.hasAuthProvider) {
        insertArgs.push(authProvider);
      }

      if (usersTable.hashedPasswordRequired) {
        insertArgs.push(`firebase-auth-${uid}-${Date.now()}`);
      }

      const placeholders = insertColumns
        .map((column) =>
          column === "date_created" ||
          column === "date_modified" ||
          column === "last_login"
            ? "CURRENT_TIMESTAMP"
            : "?",
        )
        .join(", ");

      await turso.execute({
        sql: `INSERT INTO users (${insertColumns.join(", ")}) VALUES (${placeholders})`,
        args: insertArgs,
      });
    },
    { maxAttempts: 10, fallbackAttempts: 5 },
  );
};

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid =
    typeof req.firebaseUser?.uid === "string"
      ? req.firebaseUser.uid.trim()
      : "";
  const email =
    typeof req.firebaseUser?.email === "string"
      ? req.firebaseUser.email.trim()
      : "";
  const emailVerified = Boolean(req.firebaseUser?.emailVerified);
  const signInProvider = req.firebaseUser?.signInProvider ?? null;

  if (!uid) {
    return res.status(401).json({ error: "Invalid authentication token" });
  }

  if (!email) {
    return res.status(400).json({
      error:
        "Authenticated account must include an email address. Please sign in with an email-based provider.",
    });
  }

  const isGoogleUser = signInProvider === GOOGLE_SIGN_IN_PROVIDER;
  const authProvider = isGoogleUser ? "google" : "password";
  const verified = emailVerified ? 1 : 0;

  try {
    const turso = await getTursoClient();
    const usersTable = await getUsersTableCapabilities(turso);

    let result = await turso.execute({
      sql: "SELECT * FROM users WHERE firebase_uid = ? LIMIT 1",
      args: [uid],
    });

    if (
      result.rows[0] &&
      isDeletedUser(result.rows[0], usersTable.hasDeletedAt)
    ) {
      return res.status(410).json({ error: "Account deleted" });
    }

    if (result.rows.length === 0) {
      const emailDeletedFilter = usersTable.hasDeletedAt
        ? " AND deleted_at IS NULL"
        : "";

      const existingUserByEmail = await turso.execute({
        sql: `SELECT * FROM users WHERE LOWER(email) = LOWER(?)${emailDeletedFilter} LIMIT 1`,
        args: [email],
      });

      if (existingUserByEmail.rows.length > 0) {
        const existingUser = existingUserByEmail.rows[0];

        if (
          !existingUser.firebase_uid ||
          String(existingUser.firebase_uid).trim() === ""
        ) {
          console.warn(
            `Linking Firebase UID ${uid} to existing email account: ${email}`,
          );

          const args = [uid, verified];
          let sql = `UPDATE users SET firebase_uid = ?, verified = ?`;

          if (usersTable.hasAuthProvider) {
            sql += ", auth_provider = ?";
            args.push(authProvider);
          }

          sql += `, last_login = CURRENT_TIMESTAMP, date_modified = CURRENT_TIMESTAMP
                  WHERE LOWER(email) = LOWER(?) AND (firebase_uid IS NULL OR TRIM(firebase_uid) = '')`;
          if (usersTable.hasDeletedAt) {
            sql += " AND deleted_at IS NULL";
          }
          args.push(email);

          await turso.execute({ sql, args });

          result = await getActiveUserByFirebaseUid(
            turso,
            uid,
            usersTable.hasDeletedAt,
          );
        } else if (existingUser.firebase_uid !== uid) {
          console.warn(
            `Updating Firebase UID for ${email} from ${existingUser.firebase_uid} to ${uid}`,
          );

          const args = [uid, verified];
          let sql = `UPDATE users SET firebase_uid = ?, verified = ?`;

          if (usersTable.hasAuthProvider) {
            sql += ", auth_provider = ?";
            args.push(authProvider);
          }

          sql += `, last_login = CURRENT_TIMESTAMP, date_modified = CURRENT_TIMESTAMP
                  WHERE LOWER(email) = LOWER(?)`;
          if (usersTable.hasDeletedAt) {
            sql += " AND deleted_at IS NULL";
          }
          args.push(email);

          await turso.execute({ sql, args });

          result = await getActiveUserByFirebaseUid(
            turso,
            uid,
            usersTable.hasDeletedAt,
          );
        }
      } else {
        console.warn(`Creating new Firebase user for email: ${email}`);

        await createFirebaseUser({
          turso,
          usersTable,
          uid,
          email,
          verified,
          authProvider,
        });

        result = await getActiveUserByFirebaseUid(
          turso,
          uid,
          usersTable.hasDeletedAt,
        );
      }
    } else {
      const args = [email, verified];
      let sql = `UPDATE users SET email = ?, verified = ?`;

      if (usersTable.hasAuthProvider) {
        sql += ", auth_provider = ?";
        args.push(authProvider);
      }

      sql += `, last_login = CURRENT_TIMESTAMP WHERE firebase_uid = ?`;
      if (usersTable.hasDeletedAt) {
        sql += " AND deleted_at IS NULL";
      }
      args.push(uid);

      await turso.execute({ sql, args });

      result = await getActiveUserByFirebaseUid(
        turso,
        uid,
        usersTable.hasDeletedAt,
      );
    }

    if (!result.rows[0]) {
      console.error("Failed to resolve user after sync:", { uid, email });
      return res.status(500).json({ error: "Failed to fetch user data" });
    }

    return res.status(200).json(toSafeUserMetadata(result.rows[0]));
  } catch (error) {
    console.error("Failed to get/create user:", error);
    return res.status(500).json({ error: "Failed to fetch user data" });
  }
}

export default withAuth(handler);
