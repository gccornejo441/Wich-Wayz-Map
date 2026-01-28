/**
 * Map View Preferences Utility
 *
 * Handles persistence of map view state (center, zoom, userPosition) to localStorage.
 * Uses a versioned key pattern to allow for future schema changes.
 */

/**
 * Map view preferences stored in localStorage
 */
export interface MapViewPrefs {
  /** Map center coordinates [longitude, latitude] */
  center: [number, number];
  /** Map zoom level */
  zoom: number;
  /** Timestamp when preferences were saved */
  ts: number;
  /** Optional user position [longitude, latitude] */
  userPosition?: [number, number] | null;
}

/**
 * Validates if a value is a valid [lng, lat] tuple
 * @param value - Value to validate
 * @returns True if value is [number, number] with finite values
 */
const isLngLat = (value: unknown): value is [number, number] => {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
};

/**
 * Generates the localStorage key for map view preferences
 * @param viewerKey - Optional viewer identifier (user ID or 'anon')
 * @returns localStorage key string
 */
const getStorageKey = (viewerKey?: string | number): string => {
  const key = viewerKey ?? "anon";
  return `wichwayz.mapView.v1:${key}`;
};

/**
 * Loads map view preferences from localStorage
 * @param viewerKey - Optional viewer identifier (user ID or 'anon')
 * @returns Parsed preferences or null if invalid/missing
 */
export const loadMapViewPrefs = (
  viewerKey?: string | number,
): MapViewPrefs | null => {
  try {
    const key = getStorageKey(viewerKey);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    // Validate structure
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !isLngLat(parsed.center) ||
      typeof parsed.zoom !== "number" ||
      !Number.isFinite(parsed.zoom) ||
      typeof parsed.ts !== "number"
    ) {
      console.error("Invalid map view preferences structure");
      return null;
    }

    // Validate optional userPosition if present
    if (
      parsed.userPosition !== undefined &&
      parsed.userPosition !== null &&
      !isLngLat(parsed.userPosition)
    ) {
      console.error("Invalid userPosition in map view preferences");
      return null;
    }

    return parsed as MapViewPrefs;
  } catch (error) {
    console.error("Error loading map view preferences:", error);
    return null;
  }
};

/**
 * Saves map view preferences to localStorage
 * @param prefs - Map view preferences to save
 * @param viewerKey - Optional viewer identifier (user ID or 'anon')
 */
export const saveMapViewPrefs = (
  prefs: MapViewPrefs,
  viewerKey?: string | number,
): void => {
  try {
    const key = getStorageKey(viewerKey);
    const serialized = JSON.stringify(prefs);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error("Error saving map view preferences:", error);
  }
};
