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

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Failed to fetch user by firebase uid:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}
