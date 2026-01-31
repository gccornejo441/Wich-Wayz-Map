import { describe, expect, it } from "vitest";
import { computeNearbyFeatures } from "../../src/hooks/useNearbyFeatures";

const buildFeature = (
  id: number,
  lng: number,
  lat: number,
): GeoJSON.Feature<GeoJSON.Point, { id: number }> => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lng, lat] },
  properties: { id },
});

describe("computeNearbyFeatures", () => {
  const anchor: [number, number] = [-73.9857, 40.7484]; // NYC

  it("returns empty when anchor is null", () => {
    const results = computeNearbyFeatures([], null, 5);
    expect(results).toEqual([]);
  });

  it("filters by radius and sorts ascending by distance", () => {
    const features = [
      buildFeature(1, -74.0, 40.7), // ~3 miles
      buildFeature(2, -122.4194, 37.7749), // far away
      buildFeature(3, -73.9857, 40.7484), // 0 miles
    ];

    const results = computeNearbyFeatures(features, anchor, 10);
    expect(results.map((r) => r.feature.properties.id)).toEqual([3, 1]);
    expect(results[0].distanceMiles).toBeCloseTo(0, 5);
    expect(results[1].distanceMiles).toBeGreaterThan(0);
  });

  it("returns empty when radius is non-positive or invalid", () => {
    const features = [buildFeature(1, -74, 40.7)];
    expect(computeNearbyFeatures(features, anchor, 0)).toEqual([]);
    expect(computeNearbyFeatures(features, anchor, -5)).toEqual([]);
    expect(computeNearbyFeatures(features, anchor, Number.NaN)).toEqual([]);
  });
});
