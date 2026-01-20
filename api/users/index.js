import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const rows = await executeQuery("SELECT * FROM users");
      res.status(200).json(rows);
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

      res.status(201).json(rows[0] || null);
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
    return;
  }

  res.status(405).json({ message: "Method Not Allowed" });
}
