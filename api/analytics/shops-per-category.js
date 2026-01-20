import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  try {
    const rows = await executeQuery(
      `
        SELECT c.category_name as category, COUNT(*) as shop_count
        FROM shops s
        JOIN shop_categories sc ON s.id = sc.shop_id
        JOIN categories c ON sc.category_id = c.id
        GROUP BY c.category_name
      `,
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Failed to get shops per category:", error);
    res.status(500).json({ message: "Failed to get shops per category" });
  }
}
