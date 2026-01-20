import { db, executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const { id } = req.query;
  const shopId = Number(id);

  if (!shopId) {
    res.status(400).json({ message: "Invalid shop id" });
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
