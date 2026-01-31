import { useMemo } from "react";
import { distanceMiles } from "@utils/geo";

type PointFeature<P = GeoJSON.GeoJsonProperties> = GeoJSON.Feature<
  GeoJSON.Point,
  P
>;

export type NearbyFeatureResult<P = GeoJSON.GeoJsonProperties> = {
  feature: PointFeature<P>;
  distanceMiles: number;
};

const isFiniteNumber = (value: number): value is number =>
  typeof value === "number" && Number.isFinite(value);

const extractPoint = <P,>(
  feature: PointFeature<P>,
): [number, number] | null => {
  if (feature.geometry.type !== "Point") return null;
  const [lng, lat] = feature.geometry.coordinates;
  if (!isFiniteNumber(lng) || !isFiniteNumber(lat)) return null;
  return [lng, lat];
};

export const computeNearbyFeatures = <P = GeoJSON.GeoJsonProperties>(
  features: PointFeature<P>[],
  anchor: [number, number] | null,
  radiusMiles: number,
): NearbyFeatureResult<P>[] => {
  if (!anchor) return [];
  if (!isFiniteNumber(radiusMiles) || radiusMiles <= 0) return [];

  return features
    .map((feature) => {
      const coords = extractPoint(feature);
      if (!coords) return null;

      const dist = distanceMiles(anchor, coords);
      if (!Number.isFinite(dist)) return null;

      return { feature, distanceMiles: dist };
    })
    .filter((item): item is NearbyFeatureResult<P> => !!item && item.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
};

const useNearbyFeatures = <P = GeoJSON.GeoJsonProperties>(
  features: PointFeature<P>[],
  anchor: [number, number] | null,
  radiusMiles: number,
) => {
  return useMemo(
    () => computeNearbyFeatures(features, anchor, radiusMiles),
    [features, anchor, radiusMiles],
  );
};

export default useNearbyFeatures;
