import { useEffect, useMemo } from "react";
import {
  FiCompass,
  FiMapPin,
  FiNavigation2,
  FiTarget,
  FiX,
} from "react-icons/fi";
import { useMap } from "@context/mapContext";
import { useShops } from "@context/shopContext";
import { useShopSidebar } from "@context/ShopSidebarContext";
import useNearbyFeatures from "@hooks/useNearbyFeatures";
import { useOverlay } from "@/context/overlayContext";
import {
  buildShopGeoJson,
  type ShopGeoJsonProperties,
} from "@utils/shopGeoJson";

const RADIUS_OPTIONS = [1, 3, 5, 10, 25];

const formatDistance = (value: number) => {
  if (!Number.isFinite(value)) return "";
  if (value < 0.1) return "<0.1 mi";
  return `${value.toFixed(1)} mi`;
};

const coordsChanged = (
  a: [number, number] | null,
  b: [number, number] | null,
) => {
  if (!a || !b) return Boolean(a || b);
  return Math.abs(a[0] - b[0]) > 0.0001 || Math.abs(a[1] - b[1]) > 0.0001;
};

const getCoordinatesFromFeature = (feature: GeoJSON.Feature<GeoJSON.Point>) => {
  const [lng, lat] = feature.geometry.coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat] as [number, number];
};

const NearbySidebar = () => {
  const {
    userPosition,
    flyToLocation,
    nearbyMode,
    setNearbyMode,
    nearbyRadiusMiles,
    setNearbyRadiusMiles,
    nearbyAnchorCoords,
    setNearbyAnchorCoords,
    pendingCenterCoords,
    setHoveredLocationId,
  } = useMap();

  const { isOpen, close } = useOverlay();

  // Derive stable overlay states for effect dependencies
  const nearbyOpen = isOpen("nearby");

  const { displayedShops } = useShops();
  const { openSidebar } = useShopSidebar();

  const shopFeatures = useMemo(
    () => buildShopGeoJson(displayedShops).features,
    [displayedShops],
  );

  // Default anchor for map center mode
  useEffect(() => {
    if (nearbyMode !== "mapCenter") return;
    if (nearbyAnchorCoords || !pendingCenterCoords) return;
    setNearbyAnchorCoords(pendingCenterCoords);
  }, [
    nearbyMode,
    nearbyAnchorCoords,
    pendingCenterCoords,
    setNearbyAnchorCoords,
  ]);

  const anchorCoords =
    nearbyMode === "userLocation" ? userPosition : nearbyAnchorCoords;

  const nearbyResults = useNearbyFeatures(
    shopFeatures,
    anchorCoords,
    nearbyRadiusMiles,
  );

  const handleModeChange = (mode: "mapCenter" | "userLocation") => {
    setNearbyMode(mode);
    if (mode === "mapCenter" && pendingCenterCoords) {
      setNearbyAnchorCoords(pendingCenterCoords);
    }
    if (mode === "userLocation" && userPosition) {
      setNearbyAnchorCoords(userPosition);
    }
  };

  const handleSearchThisArea = () => {
    if (!pendingCenterCoords) return;
    setNearbyAnchorCoords(pendingCenterCoords);
  };

  const handleUseLocation = () => {
    window.dispatchEvent(new Event("locateUser"));
  };

  const pendingDirty =
    nearbyMode === "mapCenter" &&
    coordsChanged(pendingCenterCoords, nearbyAnchorCoords);

  return (
    <aside
      className={`fixed top-[48px] left-0 z-40 w-full sm:w-[360px] md:w-[400px] h-[calc(100dvh-48px)] bg-surface-light dark:bg-surface-dark border-r border-surface-muted/50 dark:border-gray-700 transition-transform duration-500 ease-in-out ${
        nearbyOpen
          ? "translate-x-0 shadow-2xl"
          : "-translate-x-full shadow-none"
      }`}
      aria-label="Nearby sandwich shops"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-muted/60 dark:border-gray-700">
        <div className="flex items-center gap-2 text-text-base dark:text-text-inverted">
          <FiCompass />
          <span className="font-semibold">Nearby</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setHoveredLocationId(null);
            close("nearby");
          }}
          className="p-2 rounded-lg hover:bg-surface-muted dark:hover:bg-surface-darker text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
          aria-label="Close nearby panel"
        >
          <FiX />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleModeChange("mapCenter")}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${
              nearbyMode === "mapCenter"
                ? "bg-brand-primary text-white border-brand-primary"
                : "bg-surface-muted dark:bg-surface-darker text-text-base dark:text-text-inverted border-surface-muted"
            }`}
          >
            <FiMapPin />
            Map Area
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("userLocation")}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${
              nearbyMode === "userLocation"
                ? "bg-brand-secondary text-black border-brand-secondary"
                : "bg-surface-muted dark:bg-surface-darker text-text-base dark:text-text-inverted border-surface-muted"
            }`}
          >
            <FiTarget />
            Near Me
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setNearbyRadiusMiles(value)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                nearbyRadiusMiles === value
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-surface-muted dark:bg-surface-darker text-text-base dark:text-text-inverted border-surface-muted hover:border-brand-primary"
              }`}
            >
              {value} mi
            </button>
          ))}
        </div>

        {nearbyMode === "mapCenter" && (
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-text-muted dark:text-text-inverted/70">
              {nearbyAnchorCoords
                ? `Anchored at ${nearbyAnchorCoords[0].toFixed(3)}, ${nearbyAnchorCoords[1].toFixed(3)}`
                : "Pan the map, then search this area"}
            </div>
            {pendingDirty && (
              <button
                type="button"
                onClick={handleSearchThisArea}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-secondary hover:text-text-base transition-colors focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              >
                <FiNavigation2 />
                Search this area
              </button>
            )}
          </div>
        )}

        {nearbyMode === "userLocation" && !userPosition && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-surface-muted dark:border-gray-700 bg-surface-muted/60 dark:bg-surface-darker px-3 py-2">
            <span className="text-xs text-text-muted dark:text-text-inverted/70">
              Location unavailable. Enable location services to find shops near
              you.
            </span>
            <button
              type="button"
              onClick={handleUseLocation}
              className="px-3 py-1.5 rounded-lg bg-brand-secondary text-black text-xs font-semibold hover:bg-brand-secondary/90 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            >
              Use my location
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-surface-muted/60 dark:border-gray-700 h-[calc(100%-180px)] overflow-y-auto">
        {nearbyResults.length === 0 ? (
          <div className="px-4 py-6 text-sm text-text-muted dark:text-text-inverted/70">
            {anchorCoords
              ? "No shops found within the selected radius."
              : nearbyMode === "userLocation"
                ? "Share your location to see nearby shops."
                : "Set the anchor to the current map area to load nearby shops."}
          </div>
        ) : (
          <div className="divide-y divide-surface-muted/60 dark:divide-gray-700">
            {nearbyResults.map(({ feature, distanceMiles }) => {
              const coords = getCoordinatesFromFeature(feature);
              const props = feature.properties as ShopGeoJsonProperties;
              const locationId =
                typeof props.locationId === "number" ? props.locationId : null;
              const isClosed =
                props.locationStatus === "temporarily_closed" ||
                props.locationStatus === "permanently_closed";

              if (!coords) return null;

              return (
                <button
                  key={`${props.locationId ?? props.shopId}-${distanceMiles.toFixed(3)}`}
                  type="button"
                  className="w-full text-left p-4 hover:bg-surface-muted dark:hover:bg-surface-darker cursor-pointer transition-colors"
                  onMouseEnter={() => {
                    if (locationId !== null) setHoveredLocationId(locationId);
                  }}
                  onMouseLeave={() => setHoveredLocationId(null)}
                  onClick={() => {
                    flyToLocation(coords[0], coords[1], 14);
                    openSidebar(props, userPosition);
                    close("nearby");
                    setHoveredLocationId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      flyToLocation(coords[0], coords[1], 14);
                      openSidebar(props, userPosition);
                      close("nearby");
                      setHoveredLocationId(null);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-text-base dark:text-text-inverted line-clamp-2">
                      {props.shopName}
                    </div>
                    <div className="text-xs font-semibold text-brand-primary dark:text-brand-secondary">
                      {formatDistance(distanceMiles)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted dark:text-text-inverted/70">
                    <FiMapPin />
                    <span className="truncate">
                      {props.address || props.city || "Address unavailable"}
                    </span>
                    {isClosed && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200">
                        {props.locationStatus === "temporarily_closed"
                          ? "Temp Closed"
                          : "Closed"}
                      </span>
                    )}
                  </div>
                  {props.categories && (
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-text-muted dark:text-text-inverted/60">
                      {props.categories.split(",").slice(0, 3).join(", ")}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default NearbySidebar;
