import { useEffect, useMemo, useState } from "react";
import {
  FiBookmark,
  FiMapPin,
  FiNavigation2,
  FiTarget,
  FiX,
} from "react-icons/fi";
import { useSaved } from "@context/savedContext";
import { useShops } from "@context/shopContext";
import { useMap } from "@context/mapContext";
import { useShopSidebar } from "@context/ShopSidebarContext";
import { distanceMiles } from "@utils/geo";
import {
  buildShopGeoJson,
  type ShopGeoJsonProperties,
  type ShopFeature,
} from "@utils/shopGeoJson";
import type { ShopWithUser } from "@models/ShopWithUser";
import type { Location } from "@models/Location";

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

const pickPrimaryLocation = (shop: ShopWithUser): Location | null => {
  const locations = shop.locations ?? [];
  return (
    locations.find(
      (loc) =>
        typeof loc.latitude === "number" &&
        Number.isFinite(loc.latitude) &&
        typeof loc.longitude === "number" &&
        Number.isFinite(loc.longitude),
    ) ?? null
  );
};

type ListItem = {
  shop: ShopWithUser;
  location: Location | null;
  distanceMiles: number;
  savedAt?: string | null;
};

const SavedSidebar = () => {
  const {
    savedSidebarOpen,
    setSavedSidebarOpen,
    savedFilterMode,
    setSavedFilterMode,
    radiusMiles,
    setRadiusMiles,
    anchorMode,
    setAnchorMode,
    savedItems,
    savedShopIds,
    collections,
    activeCollectionId,
    setActiveCollectionId,
  } = useSaved();

  const { shops } = useShops();
  const {
    center,
    pendingCenterCoords,
    userPosition,
    flyToLocation,
    setHoveredLocationId,
  } = useMap();
  const { openSidebar, closeSidebar } = useShopSidebar();

  const [anchorCoords, setAnchorCoords] = useState<[number, number] | null>(
    null,
  );

  // Close map sidebar when Saved opens
  useEffect(() => {
    if (savedSidebarOpen) {
      closeSidebar();
    } else {
      setHoveredLocationId(null);
    }
  }, [savedSidebarOpen, closeSidebar, setHoveredLocationId]);

  useEffect(() => {
    if (anchorMode === "mapCenter" && center && !anchorCoords) {
      setAnchorCoords(center);
    }
    if (anchorMode === "userLocation" && userPosition) {
      setAnchorCoords(userPosition);
    }
  }, [anchorMode, center, userPosition, anchorCoords]);

  const pendingDirty =
    anchorMode === "mapCenter" &&
    coordsChanged(pendingCenterCoords, anchorCoords);

  const effectiveAnchor =
    anchorMode === "userLocation"
      ? (userPosition ?? anchorCoords)
      : (anchorCoords ?? center ?? pendingCenterCoords);

  const shopMap = useMemo(
    () =>
      new Map(
        shops
          .filter((shop) => typeof shop.id === "number")
          .map((shop) => [shop.id as number, shop]),
      ),
    [shops],
  );

  const savedOrderMap = useMemo(() => {
    const order = new Map<number, number>();
    savedItems.forEach((item, idx) => order.set(item.shopId, idx));
    return order;
  }, [savedItems]);

  const baseItemsMap = useMemo(() => {
    const entries = new Map<number, ListItem>();
    for (const item of savedItems) {
      const shop = shopMap.get(item.shopId);
      if (!shop) continue;
      const location = pickPrimaryLocation(shop);
      const distance =
        location && effectiveAnchor
          ? distanceMiles(effectiveAnchor, [
              location.longitude,
              location.latitude,
            ])
          : Infinity;
      entries.set(item.shopId, {
        shop,
        location,
        distanceMiles: distance,
        savedAt: item.dateCreated ?? null,
      });
    }
    return entries;
  }, [savedItems, shopMap, effectiveAnchor]);

  const collectionShopIds = useMemo(() => {
    const active =
      activeCollectionId !== null
        ? collections.find((col) => col.id === activeCollectionId)
        : null;
    return active?.shopIds ?? [];
  }, [collections, activeCollectionId]);

  const listItems = useMemo(() => {
    let items: ListItem[] = [];

    if (savedFilterMode === "collection") {
      items = collectionShopIds
        .map((id) => baseItemsMap.get(id))
        .filter((v): v is ListItem => Boolean(v));
      if (!items.length) {
        // Fallback to shops even if not saved to still show collection items
        items = collectionShopIds
          .map((id) => {
            const shop = shopMap.get(id);
            if (!shop) return null;
            const location = pickPrimaryLocation(shop);
            return {
              shop,
              location,
              distanceMiles:
                location && effectiveAnchor
                  ? distanceMiles(effectiveAnchor, [
                      location.longitude,
                      location.latitude,
                    ])
                  : Infinity,
            };
          })
          .filter((v): v is ListItem => Boolean(v));
      }
    } else {
      items = Array.from(baseItemsMap.values());
    }

    if (savedFilterMode === "nearby") {
      items = items
        .filter(
          (item) =>
            Number.isFinite(item.distanceMiles) &&
            item.distanceMiles <= radiusMiles,
        )
        .sort((a, b) => a.distanceMiles - b.distanceMiles);
    } else if (savedFilterMode === "all") {
      items.sort((a, b) => {
        const aOrder = savedOrderMap.get(a.shop.id ?? 0) ?? 0;
        const bOrder = savedOrderMap.get(b.shop.id ?? 0) ?? 0;
        return aOrder - bOrder;
      });
    }

    return items;
  }, [
    savedFilterMode,
    baseItemsMap,
    collectionShopIds,
    radiusMiles,
    savedOrderMap,
    shopMap,
    effectiveAnchor,
  ]);

  const features = useMemo(() => buildShopGeoJson(shops).features, [shops]);

  const featureByLocationId = useMemo(() => {
    const map = new Map<number, ShopGeoJsonProperties>();
    features.forEach((feature: ShopFeature) => {
      const locId = feature.properties.locationId;
      if (typeof locId === "number") {
        map.set(locId, feature.properties);
      }
    });
    return map;
  }, [features]);

  const featureByShopId = useMemo(() => {
    const map = new Map<number, ShopGeoJsonProperties>();
    features.forEach((feature: ShopFeature) => {
      const shopId = feature.properties.shopId;
      if (typeof shopId === "number") {
        map.set(shopId, feature.properties);
      }
    });
    return map;
  }, [features]);

  const handleSearchThisArea = () => {
    if (pendingCenterCoords) {
      setAnchorCoords(pendingCenterCoords);
    }
  };

  return (
    <aside
      className={`fixed top-[48px] left-0 z-40 w-full sm:w-[360px] md:w-[400px] h-[calc(100dvh-48px)] bg-surface-light dark:bg-surface-dark border-r border-surface-muted/50 dark:border-gray-700 transition-transform duration-500 ease-in-out ${
        savedSidebarOpen
          ? "translate-x-0 shadow-2xl"
          : "-translate-x-full shadow-none"
      }`}
      aria-label="Saved shops"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-muted/60 dark:border-gray-700">
        <div className="flex items-center gap-2 text-text-base dark:text-text-inverted">
          <FiBookmark />
          <span className="font-semibold">Saved</span>
        </div>
        <button
          type="button"
          onClick={() => setSavedSidebarOpen(false)}
          className="p-2 rounded-lg hover:bg-surface-muted dark:hover:bg-surface-darker text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
          aria-label="Close saved panel"
        >
          <FiX />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: "all", label: "All Saved" },
              { key: "nearby", label: "Saved Nearby" },
              { key: "collection", label: "Collections" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSavedFilterMode(tab.key)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                savedFilterMode === tab.key
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-surface-muted dark:bg-surface-darker text-text-base dark:text-text-inverted border-surface-muted hover:border-brand-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {savedFilterMode === "nearby" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAnchorMode("mapCenter")}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${
                  anchorMode === "mapCenter"
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-surface-muted dark:bg-surface-darker text-text-base dark:text-text-inverted border-surface-muted"
                }`}
              >
                <FiMapPin />
                Map Area
              </button>
              <button
                type="button"
                onClick={() => setAnchorMode("userLocation")}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${
                  anchorMode === "userLocation"
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
                  onClick={() => setRadiusMiles(value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                    radiusMiles === value
                      ? "bg-brand-primary text-white border-brand-primary"
                      : "bg-surface-muted dark:bg-surface-darker text-text-base dark:text-text-inverted border-surface-muted hover:border-brand-primary"
                  }`}
                >
                  {value} mi
                </button>
              ))}
            </div>

            {anchorMode === "mapCenter" && (
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-text-muted dark:text-text-inverted/70">
                  {anchorCoords
                    ? `Anchored at ${anchorCoords[0].toFixed(3)}, ${anchorCoords[1].toFixed(3)}`
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

            {anchorMode === "userLocation" && !userPosition && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-surface-muted dark:border-gray-700 bg-surface-muted/60 dark:bg-surface-darker px-3 py-2">
                <span className="text-xs text-text-muted dark:text-text-inverted/70">
                  Location unavailable. Enable location services to see saved
                  shops near you.
                </span>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("locateUser"))}
                  className="px-3 py-1.5 rounded-lg bg-brand-secondary text-black text-xs font-semibold hover:bg-brand-secondary/90 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                >
                  Use my location
                </button>
              </div>
            )}
          </div>
        )}

        {savedFilterMode === "collection" && (
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-text-muted dark:text-text-inverted/70">
              Select a list
            </label>
            <select
              className="w-full rounded-lg border border-surface-muted dark:border-gray-700 bg-white dark:bg-surface-darker text-sm text-text-base dark:text-text-inverted px-3 py-2"
              value={activeCollectionId ?? ""}
              onChange={(event) =>
                setActiveCollectionId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            >
              <option value="">Choose a collection</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name} (
                  {collection.shopCount ?? collection.shopIds?.length ?? 0})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="border-t border-surface-muted/60 dark:border-gray-700 h-[calc(100%-230px)] overflow-y-auto">
        {listItems.length === 0 ? (
          <div className="px-4 py-6 text-sm text-text-muted dark:text-text-inverted/70">
            {savedFilterMode === "collection" && !activeCollectionId
              ? "Choose a collection to view its shops."
              : savedFilterMode === "nearby" && !effectiveAnchor
                ? "Set an anchor point to see saved shops nearby."
                : "No saved shops yet."}
          </div>
        ) : (
          <ul className="divide-y divide-surface-muted/60 dark:divide-gray-700">
            {listItems.map((item) => {
              const { shop, location } = item;
              const locationId =
                location && typeof location.id === "number"
                  ? location.id
                  : null;
              const isClosed =
                location?.locationStatus === "temporarily_closed" ||
                location?.locationStatus === "permanently_closed";
              const props =
                (locationId && featureByLocationId.get(locationId)) ||
                featureByShopId.get(shop.id ?? -1);

              return (
                <li
                  key={`${shop.id}-${locationId ?? "nolocation"}`}
                  className="p-4 hover:bg-surface-muted dark:hover:bg-surface-darker cursor-pointer transition-colors"
                  onMouseEnter={() => {
                    if (locationId !== null) setHoveredLocationId(locationId);
                  }}
                  onMouseLeave={() => setHoveredLocationId(null)}
                  onClick={() => {
                    if (location) {
                      flyToLocation(location.longitude, location.latitude, 14);
                    }
                    if (props) {
                      openSidebar(
                        props,
                        location
                          ? [location.longitude, location.latitude]
                          : null,
                      );
                    }
                    setSavedSidebarOpen(false);
                    setHoveredLocationId(null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-text-base dark:text-text-inverted line-clamp-2">
                      {shop.name}
                    </div>
                    {savedFilterMode === "nearby" && (
                      <div className="text-xs font-semibold text-brand-primary dark:text-brand-secondary">
                        {formatDistance(item.distanceMiles)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted dark:text-text-inverted/70">
                    <FiMapPin />
                    <span className="truncate">
                      {location?.street_address ||
                        location?.city ||
                        "Address unavailable"}
                    </span>
                    {isClosed && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200">
                        {location?.locationStatus === "temporarily_closed"
                          ? "Temp Closed"
                          : "Closed"}
                      </span>
                    )}
                    {!isClosed && savedShopIds.has(shop.id ?? -1) && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-secondary text-black">
                        Saved
                      </span>
                    )}
                  </div>
                  {shop.categories?.length ? (
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-text-muted dark:text-text-inverted/60">
                      {shop.categories
                        .map((cat) => cat.category_name)
                        .slice(0, 3)
                        .join(", ")}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default SavedSidebar;
