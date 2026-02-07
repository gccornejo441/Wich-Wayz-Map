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
  dateCreated: user.date_created,
  lastLogin: user.last_login,
});

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid, email, emailVerified } = req.firebaseUser;

  try {
    const turso = await getTursoClient();

    let result = await turso.execute({
      sql: "SELECT * FROM users WHERE firebase_uid = ?",
      args: [uid],
    });

    if (result.rows.length === 0) {
      const baseUsername = email.split("@")[0];
      let username = baseUsername;
      let attempt = 0;

      while (attempt < 10) {
        try {
          await turso.execute({
            sql: `INSERT INTO users (
              firebase_uid, email, username, 
              role, verified, membership_status, account_status, last_login
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            args: [
              uid,
              email,
              username,
              "user",
              emailVerified ? 1 : 0,
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
    } else {
      await turso.execute({
        sql: `UPDATE users 
             SET email = ?, verified = ?, last_login = CURRENT_TIMESTAMP 
             WHERE firebase_uid = ?`,
        args: [email, emailVerified ? 1 : 0, uid],
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
