import { tursoClient } from "./apiClient";
import { Location } from "@models/Location";

/**
 * Retrieves all location rows that share duplicate (latitude, longitude) coordinates.
 * @returns A list of all duplicate Location rows.
 */
export async function getDuplicateLocations(): Promise<Location[]> {
  const db = await tursoClient.transaction();

  try {
    const query = {
      sql: `
        WITH dup_keys AS (
          SELECT latitude, longitude
          FROM locations
          GROUP BY latitude, longitude
          HAVING COUNT(*) > 1
        )
        SELECT l.*
        FROM locations l
        JOIN dup_keys d
          ON l.latitude  = d.latitude
         AND l.longitude = d.longitude
        ORDER BY l.latitude, l.longitude, l.id;
      `,
      args: {},
    };

    const result = await db.execute(query);
    await db.commit();

    return (result.rows as unknown as Location[]) ?? [];
  } catch (error) {
    await db.rollback();
    console.error("Error fetching duplicate locations:", error);
    throw error;
  }
}
