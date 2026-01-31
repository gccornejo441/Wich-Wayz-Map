import { db, executeQuery } from "../lib/db.js";
import { extractAuthUser } from "../lib/auth.js";

const validVisibility = (value) => {
  if (value === "public" || value === "unlisted" || value === "private") {
    return value;
  }
  return "private";
};

const mapCollectionRow = (row) => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  name: row.name,
  description: row.description ?? "",
  visibility: row.visibility ?? "private",
  dateCreated: row.date_created ?? null,
  dateModified: row.date_modified ?? null,
  shopCount: Number(row.shop_count ?? 0),
  shopIds: row.shop_ids
    ? String(row.shop_ids)
        .split(",")
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id))
    : [],
});

export default async function handler(req, res) {
  const { userId } = await extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const rows = await executeQuery(
        `
          SELECT
            c.id,
            c.user_id,
            c.name,
            c.description,
            c.visibility,
            c.date_created,
            c.date_modified,
            COUNT(cs.shop_id) AS shop_count,
            GROUP_CONCAT(cs.shop_id) AS shop_ids
          FROM collections c
          LEFT JOIN collection_shops cs ON cs.collection_id = c.id
          WHERE c.user_id = ?
          GROUP BY c.id
          ORDER BY c.date_created DESC;
        `,
        [userId],
      );

      res.status(200).json(rows.map(mapCollectionRow));
    } catch (error) {
      console.error("Failed to fetch collections:", error);
      res.status(500).json({ message: "Failed to fetch collections" });
    }
    return;
  }

  if (req.method === "POST") {
    const { name, description, visibility } = req.body || {};
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      res.status(400).json({ message: "Collection name is required" });
      return;
    }

    const visibilityValue = validVisibility(
      typeof visibility === "string" ? visibility : "private",
    );

    try {
      const insert = await db.execute({
        sql: `
          INSERT INTO collections (user_id, name, description, visibility)
          VALUES (?, ?, ?, ?)
        `,
        args: [userId, trimmedName, description ?? null, visibilityValue],
      });

      const newId = Number(insert.lastInsertRowid);
      const rows = await executeQuery(
        `
          SELECT
            c.id,
            c.user_id,
            c.name,
            c.description,
            c.visibility,
            c.date_created,
            c.date_modified,
            0 AS shop_count,
            NULL AS shop_ids
          FROM collections c
          WHERE c.id = ?
          LIMIT 1;
        `,
        [newId],
      );

      const created = rows?.[0] ? mapCollectionRow(rows[0]) : null;
      res.status(201).json(created);
    } catch (error) {
      console.error("Failed to create collection:", error);
      res.status(500).json({ message: "Failed to create collection" });
    }
    return;
  }

  res.status(405).json({ message: "Method Not Allowed" });
}
