import { executeQuery } from "../../lib/db.js";

const parseId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isValidStatus = (value) =>
  value === "open" ||
  value === "temporarily_closed" ||
  value === "permanently_closed";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const collectionId = parseId(req.query.id);
  if (!collectionId) {
    res.status(400).json({ message: "Invalid collection id" });
    return;
  }

  try {
    const collections = await executeQuery(
      `
        SELECT
          id,
          user_id,
          name,
          description,
          visibility,
          date_created,
          date_modified
        FROM collections
        WHERE id = ?
        LIMIT 1;
      `,
      [collectionId],
    );

    const collection = collections?.[0];
    if (!collection) {
      res.status(404).json({ message: "Collection not found" });
      return;
    }

    if (collection.visibility === "private") {
      res.status(404).json({ message: "Collection not available" });
      return;
    }

    const shopRows = await executeQuery(
      `
        SELECT
          s.id AS shop_id,
          s.name AS shop_name,
          s.description AS shop_description,
          s.created_by,
          s.modified_by,
          s.date_created,
          s.date_modified,
          s.id_location,
          u.username AS created_by_username,
          u.avatar AS users_avatar_id,
          u.email AS users_avatar_email,
          l.id AS location_id,
          l.postal_code,
          l.latitude,
          l.longitude,
          l.modified_by AS location_modified_by,
          l.date_created AS location_date_created,
          l.date_modified AS location_date_modified,
          l.street_address,
          l.street_address_second,
          l.city,
          l.state,
          l.country,
          l.phone,
          l.website_url,
          COALESCE(
            sl.status,
            CASE WHEN l.location_open = 0 THEN 'permanently_closed' ELSE 'open' END
          ) AS location_status
        FROM collection_shops cs
        JOIN shops s ON cs.shop_id = s.id
        LEFT JOIN users u ON s.created_by = u.id
        LEFT JOIN locations l ON s.id_location = l.id
        LEFT JOIN shop_locations sl ON sl.shop_id = s.id AND sl.location_id = l.id
        WHERE cs.collection_id = ?
        ORDER BY cs.sort_order ASC, cs.date_created DESC;
      `,
      [collectionId],
    );

    const categoryRows = await executeQuery(
      `
        SELECT
          sc.shop_id,
          c.id AS category_id,
          c.category_name
        FROM collection_shops cs
        JOIN shop_categories sc ON sc.shop_id = cs.shop_id
        JOIN categories c ON c.id = sc.category_id
        WHERE cs.collection_id = ?;
      `,
      [collectionId],
    );

    const shopMap = new Map();

    for (const row of shopRows || []) {
      if (!shopMap.has(row.shop_id)) {
        shopMap.set(row.shop_id, {
          id: row.shop_id,
          name: row.shop_name,
          description: row.shop_description || undefined,
          created_by: row.created_by,
          modified_by: row.modified_by ?? null,
          date_created: row.date_created,
          date_modified: row.date_modified ?? null,
          id_location: row.id_location,
          created_by_username: row.created_by_username || "admin",
          users_avatar_id: row.users_avatar_id || undefined,
          users_avatar_email: row.users_avatar_email || undefined,
          locations: [],
          categories: [],
        });
      }

      const shopEntry = shopMap.get(row.shop_id);

      if (row.location_id && !shopEntry.locations?.some((l) => l.id === row.location_id)) {
        const status = isValidStatus(row.location_status)
          ? row.location_status
          : "open";

        shopEntry.locations?.push({
          id: row.location_id,
          postal_code: row.postal_code || "",
          latitude: row.latitude || 0,
          longitude: row.longitude || 0,
          modified_by: row.location_modified_by || undefined,
          date_created: row.location_date_created || undefined,
          date_modified: row.location_date_modified || undefined,
          street_address: row.street_address || "",
          street_address_second: row.street_address_second || undefined,
          city: row.city || "",
          state: row.state || "",
          country: row.country || "",
          locationStatus: status,
          phone: row.phone || null,
          website: row.website_url || null,
          website_url: row.website_url || null,
        });
      }
    }

    for (const catRow of categoryRows || []) {
      const shopEntry = shopMap.get(catRow.shop_id);
      if (!shopEntry) continue;
      const categories = shopEntry.categories || [];
      const exists = categories.some((c) => c.id === catRow.category_id);
      if (!exists) {
        categories.push({
          id: catRow.category_id,
          category_name: catRow.category_name || "Unknown",
        });
        shopEntry.categories = categories;
      }
    }

    res.status(200).json({
      id: Number(collection.id),
      userId: Number(collection.user_id),
      name: collection.name,
      description: collection.description ?? "",
      visibility: collection.visibility,
      dateCreated: collection.date_created ?? null,
      dateModified: collection.date_modified ?? null,
      shops: Array.from(shopMap.values()),
    });
  } catch (error) {
    console.error("Failed to load public collection:", error);
    res.status(500).json({ message: "Failed to load collection" });
  }
}
