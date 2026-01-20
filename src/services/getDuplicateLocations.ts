import { apiRequest } from "./apiClient";
import { Location } from "@models/Location";

/**
 * Retrieves all location rows that share duplicate (latitude, longitude) coordinates.
 * @returns A list of all duplicate Location rows.
 */
export async function getDuplicateLocations(): Promise<Location[]> {
  try {
    const rows = await apiRequest<Location[]>("/locations/duplicates");
    return rows;
  } catch (error) {
    console.error("Error fetching duplicate locations:", error);
    throw error;
  }
}
