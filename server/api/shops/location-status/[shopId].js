import { db } from "../../lib/db.js";

export default async function handler(req, res) {
  // Only allow PATCH method
  if (req.method !== "PATCH") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  // Extract and validate shopId from URL params
  const { shopId } = req.query;
  const parsedShopId = Number(shopId);

  if (!parsedShopId || !Number.isInteger(parsedShopId)) {
    res.status(400).json({ message: "Invalid shop id" });
    return;
  }

  // Extract request body
  const { status, locationId, user_id, role } = req.body || {};

  // Authentication check
  if (!user_id) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  // Validate status
  const validStatuses = ["open", "temporarily_closed", "permanently_closed"];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({
      message:
        "Invalid status. Must be one of: open, temporarily_closed, permanently_closed",
    });
    return;
  }

  // Validate locationId if provided
  let parsedLocationId = locationId;
  if (locationId !== undefined && locationId !== null) {
    parsedLocationId = Number(locationId);
    if (!Number.isInteger(parsedLocationId)) {
      res.status(400).json({ message: "Invalid location id" });
      return;
    }
  }

  try {
    // Resolve locationId if not provided
    let resolvedLocationId = parsedLocationId;
    if (!resolvedLocationId) {
      const shopResult = await db.execute({
        sql: "SELECT id_location FROM shops WHERE id = ?",
        args: [parsedShopId],
      });

      if (!shopResult.rows || shopResult.rows.length === 0) {
        res.status(404).json({ message: "Shop not found" });
        return;
      }

      resolvedLocationId = shopResult.rows[0]?.id_location;

      if (!resolvedLocationId) {
        res.status(409).json({ message: "Shop has no associated location" });
        return;
      }
    }

    // Authorization check: query shop creator
    const shopCreatorResult = await db.execute({
      sql: "SELECT created_by FROM shops WHERE id = ?",
      args: [parsedShopId],
    });

    if (!shopCreatorResult.rows || shopCreatorResult.rows.length === 0) {
      res.status(404).json({ message: "Shop not found" });
      return;
    }

    const createdBy = shopCreatorResult.rows[0]?.created_by;
    const isAdmin = role === "admin";
    const isCreator = user_id === createdBy;

    if (!isAdmin && !isCreator) {
      res.status(403).json({
        message: "You don't have permission to update this shop's status",
      });
      return;
    }

    // UPSERT into shop_locations with migration safety
    try {
      await db.execute({
        sql: `
          INSERT INTO shop_locations (shop_id, location_id, status, date_created, date_modified)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(shop_id, location_id) DO UPDATE SET
            status = excluded.status,
            date_modified = CURRENT_TIMESTAMP
        `,
        args: [parsedShopId, resolvedLocationId, status],
      });

      // Return success response
      res.status(200).json({
        shopId: parsedShopId,
        locationId: resolvedLocationId,
        locationStatus: status,
      });
    } catch (upsertError) {
      // Check for migration-related errors
      const errorMessage = upsertError?.message || String(upsertError);
      if (
        errorMessage.includes("no such column: status") ||
        errorMessage.includes("table shop_locations has no column named status")
      ) {
        res.status(409).json({
          message:
            "Database not migrated for status yet. Run migration 001_add_shop_locations_status.sql",
        });
        return;
      }
      // Re-throw other errors to be caught by outer catch
      throw upsertError;
    }
  } catch (error) {
    console.error("Failed to update shop location status:", error);
    res.status(500).json({ message: "Failed to update shop location status" });
  }
}
