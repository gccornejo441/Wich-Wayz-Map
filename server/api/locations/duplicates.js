import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  try {
    const rows = await executeQuery(`
      WITH dup_keys AS (
        SELECT latitude, longitude
        FROM locations
        GROUP BY latitude, longitude
        HAVING COUNT(*) > 1
      )
      SELECT l.*
      FROM locations l
      JOIN dup_keys d
        ON l.latitude  = d.latitude
       AND l.longitude = d.longitude
      ORDER BY l.latitude, l.longitude, l.id;
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Failed to fetch duplicate locations:", error);
    res.status(500).json({ message: "Failed to fetch duplicate locations" });
  }
}
