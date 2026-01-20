import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  try {
    const rows = await executeQuery("SELECT COUNT(*) AS count FROM locations");
    const count = Number(rows?.[0]?.count) || 0;
    res.status(200).json({ count });
  } catch (error) {
    console.error("Failed to count locations:", error);
    res.status(500).json({ message: "Failed to count locations" });
  }
}
