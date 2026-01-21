import { executeQuery } from "../lib/db.js";

const toBoolean = (value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const lowered = String(value).toLowerCase();
  return lowered === "true" || lowered === "1";
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  try {
    const rows = await executeQuery(`
      SELECT
        s.id AS shop_id,
        s.name AS shop_name,
        s.description,
        s.modified_by,
        s.created_by,
        u.username AS created_by_username,
        u.avatar AS users_avatar_id,
        u.email AS users_avatar_email,
        s.date_created,
        s.date_modified,
        s.id_location,
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
        l.location_open,
        l.phone,
        l.website_url,
        c.id AS category_id,
        c.category_name
      FROM shops s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN shop_categories sc ON s.id = sc.shop_id
      LEFT JOIN categories c ON sc.category_id = c.id
      LEFT JOIN locations l ON s.id_location = l.id;
    `);

    const shopMap = new Map();

    for (const row of rows) {
      if (!shopMap.has(row.shop_id)) {
        shopMap.set(row.shop_id, {
          id: row.shop_id,
          name: row.shop_name,
          description: row.description || undefined,
          modified_by: row.modified_by || undefined,
          created_by: row.created_by,
          created_by_username: row.created_by_username || "admin",
          users_avatar_id: row.users_avatar_id || undefined,
          users_avatar_email: row.users_avatar_email || undefined,
          date_created: row.date_created,
          date_modified: row.date_modified || undefined,
          locations: [],
          categories: [],
        });
      }

      const shopEntry = shopMap.get(row.shop_id);

      if (row.id_location) {
        const hasLocation = shopEntry.locations?.some(
          (loc) => loc.id === row.id_location,
        );
        if (!hasLocation) {
          shopEntry.locations?.push({
            id: row.id_location,
            postal_code: row.postal_code || "",
            latitude: row.latitude || 0,
            longitude: row.longitude || 0,
            modified_by: row.location_modified_by || undefined,
            date_created: row.location_date_created || undefined,
            date_modified: row.location_date_modified || undefined,
            street_address: row.street_address || "",
            street_address_second: row.street_address_second || "",
            city: row.city || "",
            state: row.state || "",
            country: row.country || "",
            location_open: toBoolean(row.location_open),
            phone: row.phone || null,
            website: row.website_url || null,
          });
        }
      }

      if (row.category_id) {
        const categories = shopEntry.categories || [];
        const exists = categories.some((cat) => cat.id === row.category_id);
        if (!exists) {
          categories.push({
            id: row.category_id,
            category_name: row.category_name || "Unknown",
          });
          shopEntry.categories = categories;
        }
      }
    }

    res.status(200).json(Array.from(shopMap.values()));
  } catch (error) {
    console.error("Error fetching shops:", error);
    res.status(500).json({ message: "Failed to fetch shops" });
  }
}
