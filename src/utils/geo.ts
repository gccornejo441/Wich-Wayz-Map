const toRadians = (value: number) => (value * Math.PI) / 180;

const EARTH_RADIUS_MILES = 3958.8;

const isFiniteNumber = (value: number): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Calculates great-circle distance between two lng/lat coordinate pairs using the haversine formula.
 * Returns distance in miles. If either coordinate is invalid, returns Infinity.
 */
export const distanceMiles = (
  from: [number, number],
  to: [number, number],
): number => {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;

  if (![lng1, lat1, lng2, lat2].every(isFiniteNumber)) {
    return Infinity;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
};

export default distanceMiles;
