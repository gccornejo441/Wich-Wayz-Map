import { db, executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  const { id } = req.query;
  const shopId = Number(id);

  if (!shopId) {
    res.status(400).json({ message: "Invalid shop id" });
    return;
  }

  // Handle DELETE request
  if (req.method === "DELETE") {
    // Check if user is authenticated and has admin role
    const { user_id, role } = req.body || {};

    if (!user_id) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (role !== "admin") {
      res
        .status(403)
        .json({ message: "Admin access required to delete shops" });
      return;
    }

    const transaction = await db.transaction();

    try {
      // Get the location_id before deleting the shop
      const locationResult = await transaction.execute({
        sql: "SELECT id_location FROM shops WHERE id = ?",
        args: [shopId],
      });

      const locationId = locationResult.rows?.[0]?.id_location;

      // Delete shop_categories (CASCADE should handle this, but being explicit)
      await transaction.execute({
        sql: "DELETE FROM shop_categories WHERE shop_id = ?",
        args: [shopId],
      });

      // Delete shop_locations
      await transaction.execute({
        sql: "DELETE FROM shop_locations WHERE shop_id = ?",
        args: [shopId],
      });

      // Delete comments (CASCADE should handle this)
      await transaction.execute({
        sql: "DELETE FROM comments WHERE shop_id = ?",
        args: [shopId],
      });

      // Delete votes (CASCADE should handle this)
      await transaction.execute({
        sql: "DELETE FROM votes WHERE shop_id = ?",
        args: [shopId],
      });

      // Delete the shop
      await transaction.execute({
        sql: "DELETE FROM shops WHERE id = ?",
        args: [shopId],
      });

      // Delete the location if it exists and is not used by other shops
      if (locationId) {
        const otherShopsResult = await transaction.execute({
          sql: "SELECT COUNT(*) as count FROM shops WHERE id_location = ?",
          args: [locationId],
        });

        const otherShopsCount = otherShopsResult.rows?.[0]?.count || 0;

        // Only delete the location if no other shops use it
        if (otherShopsCount === 0) {
          await transaction.execute({
            sql: "DELETE FROM locations WHERE id = ?",
            args: [locationId],
          });
        }
      }

      await transaction.commit();

      res.status(200).json({
        message: "Shop deleted successfully",
        shopId,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Failed to delete shop:", error);
      res.status(500).json({ message: "Failed to delete shop" });
    }
    return;
  }

  // Handle PUT/PATCH requests
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const payload = req.body || {};
  const transaction = await db.transaction();

  try {
    const shopName = payload.shopName ?? payload.name;
    const shopDescription = payload.shop_description ?? payload.description;

    if (shopName !== undefined || shopDescription !== undefined) {
      const updates = [];
      const args = [];

      if (shopName !== undefined) {
        updates.push("name = ?");
        args.push(shopName);
      }

      if (shopDescription !== undefined) {
        updates.push("description = ?");
        args.push(shopDescription ?? null);
      }

      await transaction.execute({
        sql: `
          UPDATE shops
          SET ${updates.join(", ")}
          WHERE id = ?;
        `,
        args: [...args, shopId],
      });
    }

    if (Array.isArray(payload.categoryIds)) {
      await transaction.execute({
        sql: "DELETE FROM shop_categories WHERE shop_id = ?",
        args: [shopId],
      });

      for (const categoryId of payload.categoryIds) {
        await transaction.execute({
          sql: `
            INSERT INTO shop_categories (shop_id, category_id)
            VALUES (?, ?)
          `,
          args: [shopId, categoryId],
        });
      }
    }

    let locationId = payload.locationId ?? null;

    if (!locationId) {
      const locationResult = await transaction.execute({
        sql: `
          SELECT location_id
          FROM shop_locations
          WHERE shop_id = ?
          LIMIT 1;
        `,
        args: [shopId],
      });
      locationId = Number(locationResult.rows?.[0]?.location_id) || null;
    }

    const hasLocationUpdates = [
      "house_number",
      "address_first",
      "address_second",
      "postcode",
      "city",
      "state",
      "country",
      "latitude",
      "longitude",
      "phone",
      "website_url",
    ].some((key) => payload[key] !== undefined);

    if (locationId && hasLocationUpdates) {
      // Build street_address from house_number + address_first ONLY
      // Do NOT include city, state, or postal_code in street_address
      const streetAddress = payload.house_number
        ? `${payload.house_number} ${payload.address_first ?? ""}`.trim()
        : (payload.address_first ?? "");

      await transaction.execute({
        sql: `
          UPDATE locations
          SET 
            street_address = ?,
            street_address_second = ?,
            postal_code = ?,
            city = ?,
            state = ?,
            country = ?,
            latitude = ?,
            longitude = ?,
            phone = ?,
            website_url = ?,
            date_modified = CURRENT_TIMESTAMP
          WHERE id = ?;
        `,
        args: [
          streetAddress,
          payload.address_second ?? "",
          payload.postcode?.trim() || "",
          payload.city ?? "",
          payload.state ?? "",
          payload.country ?? "",
          payload.latitude ?? 0,
          payload.longitude ?? 0,
          payload.phone ?? "",
          payload.website_url ?? "",
          locationId,
        ],
      });
    }

    await transaction.commit();

    const [updatedShop] = await executeQuery(
      `
        SELECT 
          s.id AS id,
          s.name,
          s.description,
          s.date_created,
          s.date_modified,
          s.created_by,
          s.modified_by,
          s.id_location,
          l.city,
          l.state,
          l.country
        FROM shops s
        LEFT JOIN locations l ON s.id_location = l.id
        WHERE s.id = ?
        LIMIT 1;
      `,
      [shopId],
    );

    res.status(200).json({
      shopId,
      locationId,
      shop: updatedShop ?? null,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Failed to update shop:", error);
    res.status(500).json({ message: "Failed to update shop" });
  }
}
