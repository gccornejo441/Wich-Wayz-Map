import { executeQuery } from "../lib/db.js";
import { createHash } from "node:crypto";

const gravatarHash = (email) =>
  typeof email === "string" && email.trim()
    ? createHash("md5").update(email.trim().toLowerCase()).digest("hex")
    : null;

const getColumnSet = async (tableName) => {
  const columns = await executeQuery(`PRAGMA table_info(${tableName})`);
  return new Set(columns.map((column) => String(column.name)));
};

const optionalColumn = (columns, columnName, alias, fallback = "NULL") =>
  columns.has(columnName)
    ? `u.${columnName} AS ${alias}`
    : `${fallback} AS ${alias}`;

const mapCollectionRow = (row) => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  name: row.name,
  description: row.description ?? "",
  visibility: row.visibility ?? "public",
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
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const username =
    typeof req.query.username === "string" ? req.query.username.trim() : "";

  if (!username) {
    res.status(400).json({ message: "Username is required" });
    return;
  }

  try {
    const userColumns = await getColumnSet("users");
    const shopColumns = await getColumnSet("shops");
    const hasDeletedAt = userColumns.has("deleted_at");
    const hasProfileVisibility = userColumns.has("profile_visibility");
    const activeShopFilter = shopColumns.has("content_status")
      ? "AND COALESCE(content_status, 'active') = 'active'"
      : "";

    const deletedFilter = hasDeletedAt ? "AND u.deleted_at IS NULL" : "";
    const visibilityFilter = hasProfileVisibility
      ? "AND COALESCE(u.profile_visibility, 'public') = 'public'"
      : "";

    const profileRows = await executeQuery(
      `
        SELECT
          u.id,
          u.username,
          u.avatar,
          u.email,
          u.date_created,
          ${optionalColumn(userColumns, "bio", "bio")},
          ${optionalColumn(userColumns, "favorite_sandwich", "favorite_sandwich")},
          ${optionalColumn(userColumns, "favorite_shop_id", "favorite_shop_id")},
          fs.name AS favorite_shop_name,
          (
            SELECT COUNT(*)
            FROM shops
            WHERE created_by = u.id
            ${activeShopFilter}
          ) AS shop_count,
          (
            SELECT COUNT(*)
            FROM comments
            WHERE user_id = u.id
          ) AS comment_count
        FROM users u
        LEFT JOIN shops fs ON fs.id = ${
          userColumns.has("favorite_shop_id") ? "u.favorite_shop_id" : "NULL"
        }
        WHERE LOWER(u.username) = LOWER(?)
          ${deletedFilter}
          ${visibilityFilter}
        LIMIT 1;
      `,
      [username],
    );

    const profile = profileRows?.[0];
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    const collectionRows = await executeQuery(
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
          AND c.visibility = 'public'
        GROUP BY c.id
        ORDER BY c.date_modified DESC, c.date_created DESC;
      `,
      [Number(profile.id)],
    );

    res.status(200).json({
      id: Number(profile.id),
      username: profile.username,
      avatar: profile.avatar ?? null,
      avatarHash: gravatarHash(profile.email),
      bio: profile.bio ?? null,
      favoriteSandwich: profile.favorite_sandwich ?? null,
      favoriteShop:
        profile.favorite_shop_id && profile.favorite_shop_name
          ? {
              id: Number(profile.favorite_shop_id),
              name: profile.favorite_shop_name,
            }
          : null,
      dateCreated: profile.date_created ?? null,
      shopCount: Number(profile.shop_count ?? 0),
      commentCount: Number(profile.comment_count ?? 0),
      publicCollections: (collectionRows ?? []).map(mapCollectionRow),
    });
  } catch (error) {
    console.error("Failed to load public profile:", error);
    res.status(500).json({ message: "Failed to load profile" });
  }
}
