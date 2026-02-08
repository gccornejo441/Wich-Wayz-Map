import { withAuth } from "../lib/withAuth.js";
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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid, email, emailVerified, signInProvider } = req.firebaseUser;

  // Determine auth provider: 'google' for Google OAuth, 'password' for email/password
  const isGoogleUser = signInProvider === "google.com";
  const authProvider = isGoogleUser ? "google" : "password";

  // Backend is the single source of truth: trust Firebase emailVerified
  const verified = emailVerified ? 1 : 0;

  try {
    const turso = await getTursoClient();

    let result = await turso.execute({
      sql: "SELECT * FROM users WHERE firebase_uid = ?",
      args: [uid],
    });

    if (result.rows.length === 0) {
      // Check if email exists at all (for account linking or conflict detection)
      const existingUserByEmail = await turso.execute({
        sql: "SELECT * FROM users WHERE email = ?",
        args: [email],
      });

      if (existingUserByEmail.rows.length > 0) {
        const existingUser = existingUserByEmail.rows[0];

        // If email exists with no Firebase UID, link it
        if (!existingUser.firebase_uid) {
          console.log(
            `Linking Firebase UID ${uid} to existing email account: ${email}`,
          );
          await turso.execute({
            sql: `UPDATE users 
                 SET firebase_uid = ?, verified = ?, auth_provider = ?, last_login = CURRENT_TIMESTAMP, date_modified = CURRENT_TIMESTAMP
                 WHERE email = ? AND firebase_uid IS NULL`,
            args: [uid, verified, authProvider, email],
          });

          result = await turso.execute({
            sql: "SELECT * FROM users WHERE firebase_uid = ?",
            args: [uid],
          });
        } else if (existingUser.firebase_uid !== uid) {
          // Email exists with a different Firebase UID - update it (Firebase project may have been recreated)
          console.log(
            `Updating Firebase UID for ${email} from ${existingUser.firebase_uid} to ${uid}`,
          );
          await turso.execute({
            sql: `UPDATE users 
                 SET firebase_uid = ?, verified = ?, auth_provider = ?, last_login = CURRENT_TIMESTAMP, date_modified = CURRENT_TIMESTAMP
                 WHERE email = ?`,
            args: [uid, verified, authProvider, email],
          });

          result = await turso.execute({
            sql: "SELECT * FROM users WHERE firebase_uid = ?",
            args: [uid],
          });
        }
      } else {
        // Create new Firebase user (no hashed_password needed)
        console.log(`Creating new Firebase user for email: ${email}`);
        const baseUsername = email.split("@")[0];
        let username = baseUsername;
        let attempt = 0;

        while (attempt < 10) {
          try {
            await turso.execute({
              sql: `INSERT INTO users (
                firebase_uid, email, username, 
                role, verified, auth_provider, membership_status, account_status, 
                date_created, date_modified, last_login
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              args: [
                uid,
                email,
                username,
                "user",
                verified,
                authProvider,
                "basic",
                "active",
              ],
            });
            break;
          } catch (error) {
            if (error.message?.includes("UNIQUE constraint") && attempt < 9) {
              attempt++;
              username = `${baseUsername}-${Math.floor(1000 + Math.random() * 9000)}`;
            } else {
              throw error;
            }
          }
        }

        result = await turso.execute({
          sql: "SELECT * FROM users WHERE firebase_uid = ?",
          args: [uid],
        });
      }
    } else {
      await turso.execute({
        sql: `UPDATE users 
             SET email = ?, verified = ?, auth_provider = ?, last_login = CURRENT_TIMESTAMP 
             WHERE firebase_uid = ?`,
        args: [email, verified, authProvider, uid],
      });

      result = await turso.execute({
        sql: "SELECT * FROM users WHERE firebase_uid = ?",
        args: [uid],
      });
    }

    return res.status(200).json(toSafeUserMetadata(result.rows[0]));
  } catch (error) {
    console.error("Failed to get/create user:", error);
    return res.status(500).json({ error: "Failed to fetch user data" });
  }
}

export default withAuth(handler);
