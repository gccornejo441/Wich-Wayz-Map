import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const rows = await executeQuery(
        "SELECT id, category_name, description FROM categories",
      );
      res.status(200).json(rows);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
    return;
  }

  if (req.method === "POST") {
    const { categoryName, description } = req.body || {};

    if (!categoryName || !description) {
      res
        .status(400)
        .json({ message: "categoryName and description required" });
      return;
    }

    try {
      const existing = await executeQuery(
        "SELECT id FROM categories WHERE category_name = ? LIMIT 1",
        [categoryName],
      );
      if (existing.length) {
        res.status(409).json({ message: "Category already exists" });
        return;
      }

      await executeQuery(
        `
          INSERT INTO categories (category_name, description)
          VALUES (?, ?)
        `,
        [categoryName, description],
      );

      const rows = await executeQuery(
        "SELECT id, category_name, description FROM categories WHERE category_name = ? LIMIT 1",
        [categoryName],
      );

      res.status(201).json(rows[0] || null);
    } catch (error) {
      console.error("Failed to add category:", error);
      res.status(500).json({ message: "Failed to add category" });
    }
    return;
  }

  res.status(405).json({ message: "Method Not Allowed" });
}
