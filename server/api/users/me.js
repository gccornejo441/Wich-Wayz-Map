import { withAuth } from "../lib/withAuth.js";
import { getTursoClient } from "../lib/turso.js";
import { getUsersTableCapabilities } from "../lib/usersTable.js";

const GOOGLE_SIGN_IN_PROVIDER = "google.com";

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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid =
    typeof req.firebaseUser?.uid === "string" ? req.firebaseUser.uid.trim() : "";
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
      sql: "SELECT * FROM users WHERE firebase_uid = ?",
      args: [uid],
    });

    if (result.rows.length === 0) {
      const existingUserByEmail = await turso.execute({
        sql: "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
        args: [email],
      });

      if (existingUserByEmail.rows.length > 0) {
        const existingUser = existingUserByEmail.rows[0];

        if (!existingUser.firebase_uid || String(existingUser.firebase_uid).trim() === "") {
          console.warn(`Linking Firebase UID ${uid} to existing email account: ${email}`);

          const args = [uid, verified];
          let sql = `UPDATE users SET firebase_uid = ?, verified = ?`;

          if (usersTable.hasAuthProvider) {
            sql += ", auth_provider = ?";
            args.push(authProvider);
          }

          sql += `, last_login = CURRENT_TIMESTAMP, date_modified = CURRENT_TIMESTAMP
                  WHERE LOWER(email) = LOWER(?) AND (firebase_uid IS NULL OR TRIM(firebase_uid) = '')`;
          args.push(email);

          await turso.execute({ sql, args });

          result = await turso.execute({
            sql: "SELECT * FROM users WHERE firebase_uid = ?",
            args: [uid],
          });
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
          args.push(email);

          await turso.execute({ sql, args });

          result = await turso.execute({
            sql: "SELECT * FROM users WHERE firebase_uid = ?",
            args: [uid],
          });
        }
      } else {
        console.warn(`Creating new Firebase user for email: ${email}`);

        const baseUsername = email.split("@")[0];
        let username = baseUsername;
        let attempt = 0;

        while (attempt < 10) {
          try {
            const insertColumns = [
              "firebase_uid",
              "email",
              "username",
              "role",
              "verified",
              "membership_status",
              "account_status",
            ];
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
              insertColumns.push("auth_provider");
              insertArgs.push(authProvider);
            }

            if (usersTable.hashedPasswordRequired) {
              insertColumns.push("hashed_password");
              insertArgs.push(`firebase-auth-${uid}-${Date.now()}`);
            }

            insertColumns.push("date_created", "date_modified", "last_login");

            const placeholders = insertColumns
              .map((col) =>
                col === "date_created" ||
                col === "date_modified" ||
                col === "last_login"
                  ? "CURRENT_TIMESTAMP"
                  : "?",
              )
              .join(", ");

            await turso.execute({
              sql: `INSERT INTO users (${insertColumns.join(", ")}) VALUES (${placeholders})`,
              args: insertArgs,
            });

            break;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            const isUsernameConflict =
              errorMessage.includes("UNIQUE constraint") &&
              errorMessage.includes("users.username");

            if (isUsernameConflict && attempt < 9) {
              attempt += 1;
              username = `${baseUsername}-${Math.floor(1000 + Math.random() * 9000)}`;
              continue;
            }

            throw error;
          }
        }

        result = await turso.execute({
          sql: "SELECT * FROM users WHERE firebase_uid = ?",
          args: [uid],
        });
      }
    } else {
      const args = [email, verified];
      let sql = `UPDATE users SET email = ?, verified = ?`;

      if (usersTable.hasAuthProvider) {
        sql += ", auth_provider = ?";
        args.push(authProvider);
      }

      sql += `, last_login = CURRENT_TIMESTAMP WHERE firebase_uid = ?`;
      args.push(uid);

      await turso.execute({ sql, args });

      result = await turso.execute({
        sql: "SELECT * FROM users WHERE firebase_uid = ?",
        args: [uid],
      });
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
