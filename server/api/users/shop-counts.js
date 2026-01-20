import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  try {
    const rows = await executeQuery(
      `
        SELECT 
          u.id AS userId, 
          u.email,
          u.avatar, 
          COUNT(s.id) AS shopCount
        FROM 
          users u
        LEFT JOIN 
          shops s ON u.id = s.created_by
        GROUP BY 
          u.id, u.email;
      `,
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Failed to fetch shop counts by user:", error);
    res.status(500).json({ message: "Failed to fetch shop counts by user" });
  }
}
