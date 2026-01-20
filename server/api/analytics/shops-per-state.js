import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  try {
    const rows = await executeQuery(
      `
        SELECT l.state, COUNT(*) as shop_count
        FROM shops s
        JOIN shop_locations sl ON s.id = sl.shop_id
        JOIN locations l ON sl.location_id = l.id
        GROUP BY l.state
        ORDER BY shop_count DESC
      `,
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Failed to get shops per state:", error);
    res.status(500).json({ message: "Failed to get shops per state" });
  }
}
