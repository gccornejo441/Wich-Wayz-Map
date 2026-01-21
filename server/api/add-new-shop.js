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

  // Check if transaction API is available
  if (typeof db.transaction !== "function") {
    console.error(
      "[add-new-shop] CRITICAL: db.transaction is not a function, type:",
      typeof db.transaction,
    );
    return res
      .status(500)
      .json({ error: "Database transaction not supported" });
  }

  let transaction;
  try {
    transaction = await db.transaction();
    console.error("[add-new-shop] Transaction created successfully");
  } catch (transactionError) {
    console.error(
      "[add-new-shop] CRITICAL: Failed to create transaction:",
      transactionError,
    );
    return res.status(500).json({
      error: "Failed to create database transaction",
      details: transactionError.message,
    });
  }
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

  try {
    console.error("[add-new-shop] Step 1: Inserting location...");
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
    console.error("[add-new-shop] Location inserted successfully");

    console.error("[add-new-shop] Step 2: Getting location ID...");
    const locationResult = await transaction.execute({
      sql: `SELECT last_insert_rowid() AS last_insert_rowid;`,
    });
    console.error("[add-new-shop] Location result:", locationResult);

    const locationId = Number(locationResult.rows?.[0]?.last_insert_rowid);
    if (!locationId) {
      throw new Error("Failed to determine location id");
    }
    console.error("[add-new-shop] Location ID:", locationId);

    console.error(
      "[add-new-shop] Step 3: Inserting shop with modified_by as userId:",
      userId,
    );
    await transaction.execute({
      sql: `
        INSERT INTO shops (name, description, created_by, modified_by, id_location)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [shopName, shop_description, userId, userId, locationId],
    });
    console.error("[add-new-shop] Shop inserted successfully");

    console.error("[add-new-shop] Step 4: Getting shop ID...");
    const shopResult = await transaction.execute({
      sql: `SELECT last_insert_rowid() AS last_insert_rowid;`,
    });
    console.error("[add-new-shop] Shop result:", shopResult);

    const shopId = Number(shopResult.rows?.[0]?.last_insert_rowid);
    if (!shopId) {
      throw new Error("Failed to determine shop id");
    }
    console.error("[add-new-shop] Shop ID:", shopId);

    console.error(
      "[add-new-shop] Step 5: Inserting shop_location relationship...",
    );
    await transaction.execute({
      sql: `INSERT INTO shop_locations (shop_id, location_id) VALUES (?, ?)`,
      args: [shopId, locationId],
    });
    console.error("[add-new-shop] Shop location relationship inserted");

    console.error(
      "[add-new-shop] Step 6: Inserting categories (count:",
      selectedCategoryIds?.length,
      ")...",
    );
    for (const catId of selectedCategoryIds) {
      console.error("[add-new-shop] Inserting category:", catId);
      await transaction.execute({
        sql: `INSERT INTO shop_categories (shop_id, category_id) VALUES (?, ?)`,
        args: [shopId, catId],
      });
    }
    console.error("[add-new-shop] All categories inserted");

    console.error("[add-new-shop] Step 7: Committing transaction...");
    await transaction.commit();
    console.error("[add-new-shop] Transaction committed successfully");

    res.status(200).json({ shopId, locationId });
  } catch (err) {
    console.error(
      "[add-new-shop] CRITICAL ERROR - Transaction failed at some step",
    );
    console.error("[add-new-shop] Error name:", err.name);
    console.error("[add-new-shop] Error message:", err.message);
    console.error("[add-new-shop] Error stack:", err.stack);
    console.error(
      "[add-new-shop] Full error object:",
      JSON.stringify(err, Object.getOwnPropertyNames(err)),
    );

    try {
      await transaction.rollback();
      console.error("[add-new-shop] Transaction rolled back successfully");
    } catch (rollbackErr) {
      console.error("[add-new-shop] CRITICAL: Rollback failed:", rollbackErr);
    }

    res.status(500).json({
      error: "Failed to submit shop",
      details: err.message,
      step: "Check server logs for detailed error information",
    });
  }
}
