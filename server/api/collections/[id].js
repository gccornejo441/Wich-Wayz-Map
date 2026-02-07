import { executeQuery } from "../lib/db.js";
import { withDbUser } from "../lib/withAuth.js";

const validVisibility = (value) => {
  if (value === "public" || value === "unlisted" || value === "private") {
    return value;
  }
  return null;
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

async function handler(req, res) {
  const { id } = req.query;
  const collectionId = Number(id);

  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    res.status(400).json({ message: "Invalid collection id" });
    return;
  }

  if (req.method === "PATCH") {
    const { name, description, visibility } = req.body || {};

    const updates = [];
    const params = [];

    if (typeof name === "string" && name.trim()) {
      updates.push("name = ?");
      params.push(name.trim());
    }

    if (description !== undefined) {
      updates.push("description = ?");
      params.push(
        description === null
          ? null
          : typeof description === "string"
            ? description.trim()
            : String(description),
      );
    }

    const visibilityValue = validVisibility(
      typeof visibility === "string" ? visibility : null,
    );
    if (visibilityValue) {
      updates.push("visibility = ?");
      params.push(visibilityValue);
    }

    if (!updates.length) {
      res.status(400).json({ message: "No valid fields to update" });
      return;
    }

    updates.push("date_modified = CURRENT_TIMESTAMP");

    try {
      const rows = await executeQuery(
        `
          UPDATE collections
          SET ${updates.join(", ")}
          WHERE id = ? AND user_id = ?
          RETURNING
            id,
            user_id,
            name,
            description,
            visibility,
            date_created,
            date_modified,
            (SELECT COUNT(*) FROM collection_shops cs WHERE cs.collection_id = collections.id) AS shop_count,
            (SELECT GROUP_CONCAT(cs.shop_id) FROM collection_shops cs WHERE cs.collection_id = collections.id) AS shop_ids;
        `,
        [...params, collectionId, req.dbUser.id],
      );

      const updated = rows?.[0];
      if (!updated) {
        res.status(404).json({ message: "Collection not found" });
        return;
      }

      res.status(200).json(mapCollectionRow(updated));
    } catch (error) {
      console.error("Failed to update collection:", error);
      res.status(500).json({ message: "Failed to update collection" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const existing = await executeQuery(
        `SELECT id FROM collections WHERE id = ? AND user_id = ? LIMIT 1`,
        [collectionId, req.dbUser.id],
      );

      if (!existing?.length) {
        res.status(404).json({ message: "Collection not found" });
        return;
      }

      await executeQuery(
        `DELETE FROM collections WHERE id = ? AND user_id = ?`,
        [collectionId, req.dbUser.id],
      );

      res.status(204).end();
    } catch (error) {
      console.error("Failed to delete collection:", error);
      res.status(500).json({ message: "Failed to delete collection" });
    }
    return;
  }

  res.status(405).json({ message: "Method Not Allowed" });
}

export default withDbUser(handler);
