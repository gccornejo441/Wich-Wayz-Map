import { db } from "./lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let step = "init";

  // Harden request body parsing
  let body;
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body);
    } catch (parseErr) {
      console.error("[add-new-shop] Failed to parse body string:", parseErr);
      return res.status(400).json({ error: "Invalid JSON in request body" });
    }
  } else if (req.body === null || req.body === undefined) {
    body = {};
  } else {
    body = req.body;
  }

  console.error("[add-new-shop] Received request body:", JSON.stringify(body));

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
  } = body;

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

  // Build street_address from house_number + address_first ONLY
  // Do NOT include city, state, or postal_code in street_address
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
    step = "insert_location";
    console.error(
      "[add-new-shop] Step: insert_location - Inserting location...",
    );
    const locationInsert = await db.execute({
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

    // Get location ID from INSERT result
    locationId = Number(locationInsert.lastInsertRowid);
    if (!Number.isFinite(locationId) || locationId <= 0) {
      throw new Error("Failed to determine location id from lastInsertRowid");
    }
    console.error("[add-new-shop] Location ID:", locationId);

    // Step 2: Insert shop
    step = "insert_shop";
    console.error(
      "[add-new-shop] Step: insert_shop - Inserting shop with modified_by as userId:",
      userId,
    );
    const shopInsert = await db.execute({
      sql: `
        INSERT INTO shops (name, description, created_by, modified_by, id_location)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [shopName, shop_description, userId, userId, locationId],
    });
    console.error("[add-new-shop] Shop inserted successfully");

    // Get shop ID from INSERT result
    shopId = Number(shopInsert.lastInsertRowid);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      throw new Error("Failed to determine shop id from lastInsertRowid");
    }
    console.error("[add-new-shop] Shop ID:", shopId);

    // Step 3: Insert shop_location relationship
    step = "insert_shop_locations";
    console.error(
      "[add-new-shop] Step: insert_shop_locations - Inserting shop_location relationship...",
    );
    await db.execute({
      sql: `INSERT INTO shop_locations (shop_id, location_id) VALUES (?, ?)`,
      args: [shopId, locationId],
    });
    console.error("[add-new-shop] Shop location relationship inserted");

    // Step 4: Insert categories
    step = "insert_shop_categories";
    console.error(
      "[add-new-shop] Step: insert_shop_categories - Inserting categories (count:",
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
      "[add-new-shop] CRITICAL ERROR - Operation failed at step:",
      step,
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
      step,
    });
  }
}
