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
          c.id,
          c.category_name AS name,
          COUNT(sc.shop_id) AS shopCount
        FROM categories c
        LEFT JOIN shop_categories sc ON c.id = sc.category_id
        GROUP BY c.id
        ORDER BY shopCount DESC;
      `,
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Failed to fetch categories with shop counts:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch categories with shop counts" });
  }
}
