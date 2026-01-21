import { db } from "./lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.error(
    "[add-new-shop] Received request body:",
    JSON.stringify(req.body),
  );

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

  console.error("[add-new-shop] Extracted fields:", {
    shopName,
    userId,
    house_number,
    address_first,
    city,
    state,
    postcode,
    country,
    latitude,
    longitude,
    categoryCount: selectedCategoryIds?.length,
  });

  const streetAddress = [house_number, address_first]
    .filter(Boolean)
    .join(" ")
    .trim();
  const streetAddressSecond = address_second || null;

  console.error("[add-new-shop] Prepared data:", {
    streetAddress,
    streetAddressSecond,
    userId,
  });

  let locationId;
  let shopId;

  try {
    // Step 1: Insert location
    console.error("[add-new-shop] Step 1: Inserting location...");
    await db.execute({
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
    console.error("[add-new-shop] Location inserted successfully");

    // Step 2: Get location ID
    console.error("[add-new-shop] Step 2: Getting location ID...");
    const locationResult = await db.execute({
      sql: `SELECT last_insert_rowid() AS last_insert_rowid;`,
    });
    console.error("[add-new-shop] Location result:", locationResult);

    locationId = Number(locationResult.rows?.[0]?.last_insert_rowid);
    if (!locationId) {
      throw new Error("Failed to determine location id");
    }
    console.error("[add-new-shop] Location ID:", locationId);

    // Step 3: Insert shop
    console.error(
      "[add-new-shop] Step 3: Inserting shop with modified_by as userId:",
      userId,
    );
    await db.execute({
      sql: `
        INSERT INTO shops (name, description, created_by, modified_by, id_location)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [shopName, shop_description, userId, userId, locationId],
    });
    console.error("[add-new-shop] Shop inserted successfully");

    // Step 4: Get shop ID
    console.error("[add-new-shop] Step 4: Getting shop ID...");
    const shopResult = await db.execute({
      sql: `SELECT last_insert_rowid() AS last_insert_rowid;`,
    });
    console.error("[add-new-shop] Shop result:", shopResult);

    shopId = Number(shopResult.rows?.[0]?.last_insert_rowid);
    if (!shopId) {
      throw new Error("Failed to determine shop id");
    }
    console.error("[add-new-shop] Shop ID:", shopId);

    // Step 5: Insert shop_location relationship
    console.error(
      "[add-new-shop] Step 5: Inserting shop_location relationship...",
    );
    await db.execute({
      sql: `INSERT INTO shop_locations (shop_id, location_id) VALUES (?, ?)`,
      args: [shopId, locationId],
    });
    console.error("[add-new-shop] Shop location relationship inserted");

    // Step 6: Insert categories
    console.error(
      "[add-new-shop] Step 6: Inserting categories (count:",
      selectedCategoryIds?.length,
      ")...",
    );
    for (const catId of selectedCategoryIds) {
      console.error("[add-new-shop] Inserting category:", catId);
      await db.execute({
        sql: `INSERT INTO shop_categories (shop_id, category_id) VALUES (?, ?)`,
        args: [shopId, catId],
      });
    }
    console.error("[add-new-shop] All categories inserted");

    console.error("[add-new-shop] All operations completed successfully");
    res.status(200).json({ shopId, locationId });
  } catch (err) {
    console.error(
      "[add-new-shop] CRITICAL ERROR - Operation failed at some step",
    );
    console.error("[add-new-shop] Error name:", err.name);
    console.error("[add-new-shop] Error message:", err.message);
    console.error("[add-new-shop] Error stack:", err.stack);
    console.error(
      "[add-new-shop] Full error object:",
      JSON.stringify(err, Object.getOwnPropertyNames(err)),
    );

    // Attempt cleanup if we have IDs
    if (shopId) {
      console.error("[add-new-shop] Attempting to cleanup shop_id:", shopId);
      try {
        await db.execute({
          sql: `DELETE FROM shop_categories WHERE shop_id = ?`,
          args: [shopId],
        });
        await db.execute({
          sql: `DELETE FROM shop_locations WHERE shop_id = ?`,
          args: [shopId],
        });
        await db.execute({
          sql: `DELETE FROM shops WHERE id = ?`,
          args: [shopId],
        });
        console.error("[add-new-shop] Shop cleanup successful");
      } catch (cleanupErr) {
        console.error("[add-new-shop] Cleanup failed:", cleanupErr);
      }
    }

    if (locationId) {
      console.error(
        "[add-new-shop] Attempting to cleanup location_id:",
        locationId,
      );
      try {
        await db.execute({
          sql: `DELETE FROM locations WHERE id = ?`,
          args: [locationId],
        });
        console.error("[add-new-shop] Location cleanup successful");
      } catch (cleanupErr) {
        console.error("[add-new-shop] Location cleanup failed:", cleanupErr);
      }
    }

    res.status(500).json({
      error: "Failed to submit shop",
      details: err.message,
      step: "Check server logs for detailed error information",
    });
  }
}
