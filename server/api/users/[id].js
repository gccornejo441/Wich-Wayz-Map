import { executeQuery } from "../lib/db.js";
import { sanitizeUsername, validateUsername } from "../lib/username.js";

const hasUsernameFinalizedAt = async () => {
  const columns = await executeQuery("PRAGMA table_info(users)");
  return columns.some(
    (column) => String(column.name) === "username_finalized_at",
  );
};

const buildDeletedEmail = (userId) =>
  `deleted-user-${userId}-${Date.now()}@deleted.local`;

export default async function handler(req, res) {
  const { id } = req.query;
  const userId = Number(id);

  if (!userId) {
    res.status(400).json({ message: "Invalid user id" });
    return;
  }

  if (req.method === "GET") {
    try {
      const rows = await executeQuery(
        "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
        [userId],
      );
      if (!rows.length) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.status(200).json(rows[0]);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
    return;
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    const {
      role,
      membershipStatus,
      accountStatus,
      first_name,
      last_name,
      username,
      avatar,
    } = req.body || {};

    const updates = [];
    const args = [];
    let requestedUsername = null;

    if (role) {
      const validRoles = ["admin", "editor", "member", "viewer"];
      if (!validRoles.includes(role)) {
        res.status(400).json({ message: "Invalid role" });
        return;
      }
      updates.push("role = ?");
      args.push(role);
    }

    if (membershipStatus) {
      updates.push("membership_status = ?");
      args.push(membershipStatus);
    }

    if (accountStatus) {
      updates.push("account_status = ?");
      args.push(accountStatus);
    }

    if (first_name !== undefined) {
      updates.push("first_name = ?");
      args.push(first_name);
    }

    if (last_name !== undefined) {
      updates.push("last_name = ?");
      args.push(last_name);
    }

    if (username !== undefined) {
      if (typeof username !== "string") {
        res.status(400).json({ message: "Username must be a string" });
        return;
      }

      requestedUsername = username.trim();

      const validation = validateUsername(requestedUsername);
      if (!validation.ok) {
        res
          .status(400)
          .json({ message: validation.reason || "Invalid username" });
        return;
      }
    }

    if (avatar !== undefined) {
      updates.push("avatar = ?");
      args.push(avatar);
    }

    try {
      if (requestedUsername !== null && !(await hasUsernameFinalizedAt())) {
        res.status(409).json({
          message:
            "Username updates are unavailable until migrations are applied",
        });
        return;
      }

      const existing = await executeQuery(
        "SELECT id, username, username_finalized_at FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
        [userId],
      );

      if (!existing.length) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (requestedUsername !== null) {
        const normalizedUsername = sanitizeUsername(requestedUsername);
        const currentUsername = String(existing[0].username ?? "");
        const hasFinalized = Boolean(existing[0].username_finalized_at);

        if (hasFinalized) {
          res.status(400).json({ message: "Username is already finalized" });
          return;
        }

        if (
          currentUsername.toLowerCase() !== normalizedUsername.toLowerCase()
        ) {
          updates.push("username = ?");
          args.push(normalizedUsername);
          updates.push("username_finalized_at = CURRENT_TIMESTAMP");
        }
      }

      if (!updates.length) {
        res.status(400).json({ message: "No updates provided" });
        return;
      }

      await executeQuery(
        `UPDATE users SET ${updates.join(", ")}, date_modified = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
        [...args, userId],
      );
      const rows = await executeQuery(
        "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
        [userId],
      );
      res.status(200).json(rows[0] || null);
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const existing = await executeQuery(
        "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
        [userId],
      );

      if (!existing.length) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      await executeQuery(
        `
          UPDATE users
          SET
            email = ?,
            first_name = NULL,
            last_name = NULL,
            avatar = NULL,
            verification_token = NULL,
            token_expiry = NULL,
            reset_token = NULL,
            verified = 0,
            hashed_password = ?,
            membership_status = 'deleted',
            account_status = 'deleted',
            deleted_at = CURRENT_TIMESTAMP,
            date_modified = CURRENT_TIMESTAMP
          WHERE id = ? AND deleted_at IS NULL
        `,
        [
          buildDeletedEmail(userId),
          `deleted-account-${userId}-${Date.now()}`,
          userId,
        ],
      );
      res.status(204).end();
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
    return;
  }

  res.status(405).json({ message: "Method Not Allowed" });
}
