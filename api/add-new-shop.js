import { db } from "./lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    shopName,
    shop_description,
    userId,
    house_number,
    address_first,
    address_second,
    city,
    state,
    postcode,
    country,
    latitude,
    longitude,
    selectedCategoryIds = [],
  } = req.body;

  const transaction = await db.transaction();
  const streetAddress = [house_number, address_first]
    .filter(Boolean)
    .join(" ")
    .trim();
  const streetAddressSecond = address_second || null;

  try {
    await transaction.execute({
      sql: `
        INSERT INTO locations
        (street_address, street_address_second, city, state, country, postal_code, latitude, longitude, modified_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        streetAddress,
        streetAddressSecond,
        city,
        state,
        country,
        postcode,
        latitude,
        longitude,
        userId,
      ],
    });

    const locationResult = await transaction.execute({
      sql: `SELECT last_insert_rowid() AS last_insert_rowid;`,
    });

    const locationId = Number(locationResult.rows?.[0]?.last_insert_rowid);
    if (!locationId) {
      throw new Error("Failed to determine location id");
    }

    await transaction.execute({
      sql: `
        INSERT INTO shops (name, description, created_by, modified_by, id_location)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [shopName, shop_description, userId, null, locationId],
    });

    const shopResult = await transaction.execute({
      sql: `SELECT last_insert_rowid() AS last_insert_rowid;`,
    });

    const shopId = Number(shopResult.rows?.[0]?.last_insert_rowid);
    if (!shopId) {
      throw new Error("Failed to determine shop id");
    }

    await transaction.execute({
      sql: `INSERT INTO shop_locations (shop_id, location_id) VALUES (?, ?)`,
      args: [shopId, locationId],
    });

    for (const catId of selectedCategoryIds) {
      await transaction.execute({
        sql: `INSERT INTO shop_categories (shop_id, category_id) VALUES (?, ?)`,
        args: [shopId, catId],
      });
    }

    await transaction.commit();
    res.status(200).json({ shopId, locationId });
  } catch (err) {
    await transaction.rollback();
    console.error("DB transaction failed:", err);
    res.status(500).json({ error: "Failed to submit shop" });
  }
}
