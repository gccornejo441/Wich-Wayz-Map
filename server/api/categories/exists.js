import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const { name } = req.query;

  if (!name || typeof name !== "string") {
    res.status(400).json({ message: "name query param required" });
    return;
  }

  try {
    const rows = await executeQuery(
      "SELECT 1 FROM categories WHERE category_name = ? LIMIT 1",
      [name],
    );
    res.status(200).json({ exists: rows.length > 0 });
  } catch (error) {
    console.error("Failed to check category:", error);
    res.status(500).json({ message: "Failed to check category" });
  }
}
