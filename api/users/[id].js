import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  const { id } = req.query;
  const userId = Number(id);

  if (!userId) {
    res.status(400).json({ message: "Invalid user id" });
    return;
  }

  if (req.method === "GET") {
    try {
      const rows = await executeQuery("SELECT * FROM users WHERE id = ?", [
        userId,
      ]);
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
    const { role, membershipStatus, accountStatus } = req.body || {};

    const updates = [];
    const args = [];

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

    if (!updates.length) {
      res.status(400).json({ message: "No updates provided" });
      return;
    }

    try {
      await executeQuery(
        `UPDATE users SET ${updates.join(", ")}, date_modified = CURRENT_TIMESTAMP WHERE id = ?`,
        [...args, userId],
      );
      const rows = await executeQuery("SELECT * FROM users WHERE id = ?", [
        userId,
      ]);
      res.status(200).json(rows[0] || null);
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await executeQuery("DELETE FROM users WHERE id = ?", [userId]);
      res.status(204).end();
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
    return;
  }

  res.status(405).json({ message: "Method Not Allowed" });
}
