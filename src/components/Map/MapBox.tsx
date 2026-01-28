import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { GeoJSONSource, Map } from "mapbox-gl";
import { GiSandwich } from "react-icons/gi";
import { useLocation } from "react-router-dom";

import "mapbox-gl/dist/mapbox-gl.css";

import { useShops } from "@/context/shopContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@context/authContext";
import { parseDeepLink } from "@utils/deepLink";
import { buildStreetAddress, buildCityStateZip } from "@utils/address";
import { loadMapViewPrefs, saveMapViewPrefs } from "@utils/mapViewPrefs";
import type { Location } from "@models/Location";
import type { ShopWithUser } from "@models/ShopWithUser";
import type { ShopDataVariants, LocationDataVariants } from "@/types/dataTypes";
import SpeedDial from "../Dial/SpeedDial";

const INITIAL_CENTER: [number, number] = [-74.0242, 40.6941];
const INITIAL_ZOOM = 10.12;

const MAPBOX_STYLE_LIGHT = "mapbox://styles/mapbox/streets-v12";
const MAPBOX_STYLE_DARK = "mapbox://styles/mapbox/navigation-night-v1";

const loadingMessages = [
  "Stacking the Sandwich...",
  "Toasting the Bread...",
  "Adding the Pickles...",
  "Wrapping Your Order...",
  "Cooking Up Something Tasty...",
  "Finding the Perfect Bite...",
  "Crafting Your Sammie...",
  "Grilling to Perfection...",
  "Prepping Your Layers...",
  "Serving It Up Fresh...",
];

export type ShopGeoJsonProperties = {
  shopId: number;
  shopName: string;
  categories: string;

  imageUrl?: string;
  description?: string;

  usersAvatarEmail?: string;
  usersAvatarId?: string;
  createdBy?: string;
  created_by?: number;

  votes?: number;
  categoryIds?: number[];

  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  phone?: string;
  website?: string;
  website_url?: string;

  latitude?: number;
  longitude?: number;

  locationStatus?: "open" | "temporarily_closed" | "permanently_closed";
  locationId?: number;

  [key: string]: unknown;
};

type ShopFeature = GeoJSON.Feature<GeoJSON.Point, ShopGeoJsonProperties>;
type ShopFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  ShopGeoJsonProperties
>;

const SOURCE_ID = "shops";
const CLUSTERS_LAYER_ID = "shops-clusters";
const CLUSTER_COUNT_LAYER_ID = "shops-cluster-count";
const UNCLUSTERED_LAYER_ID = "shops-unclustered";

const CLUSTER_COLOR = "#DA291C";
const CLUSTER_TEXT_COLOR = "#FFFFFF";
const POINT_COLOR = "#DA291C";
const POINT_STROKE_COLOR = "#5A110C";

const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const getString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

const toNumber = (v: unknown): number | undefined => {
  if (isNumber(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const useLatest = <T,>(value: T) => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
};

const getLngLat = (loc: Location): { lng: number; lat: number } | null => {
  const maybeLng = loc.longitude;
  const maybeLat = loc.latitude;

  if (!isNumber(maybeLng) || !isNumber(maybeLat)) return null;
  return { lng: maybeLng, lat: maybeLat };
};

const getShopName = (shop: ShopWithUser): string => {
  if (typeof shop.name === "string" && shop.name.length) return shop.name;
  return "";
};

const getCategoriesString = (shop: ShopWithUser): string => {
  if (Array.isArray(shop.categories)) {
    return shop.categories
      .map((cat) => cat.category_name)
      .filter((x): x is string => typeof x === "string")
      .join(",");
  }
  return "";
};

const stopMapClick = (e: mapboxgl.MapMouseEvent) => {
  e.preventDefault();
  const oe = e.originalEvent;
  if (oe) {
    oe.preventDefault();
    oe.stopPropagation();
    if (
      "stopImmediatePropagation" in oe &&
      typeof oe.stopImmediatePropagation === "function"
    ) {
      oe.stopImmediatePropagation();
    }
  }
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildPopupHtml = (props: ShopGeoJsonProperties) => {
  const shopName = escapeHtml(props.shopName ?? "");
  const street = escapeHtml(props.address ?? "");
  const city = props.city ?? "";
  const state = props.state ?? "";
  const postalCode = props.postalCode ?? "";

  // Build city/state/zip line using helper
  const cityStateZip = buildCityStateZip(city, state, postalCode);
  const cityStateZipEscaped = cityStateZip ? escapeHtml(cityStateZip) : "";

  return `
    <div class="bg-surface-light dark:bg-surface-dark text-sm rounded-lg max-w-xs -m-3 -mb-5 p-3 animate-fadeIn transition-sidebar">
      <h2 class="text-base font-bold text-brand-primary dark:text-brand-secondary ">${shopName}</h2>
      ${street || cityStateZipEscaped
      ? `
        <div class="text-text-base dark:text-text-inverted">
          ${street ? `<div>${street}</div>` : ""}
          ${cityStateZipEscaped ? `<div class="text-xs opacity-80 mt-0.5">${cityStateZipEscaped}</div>` : ""}
        </div>
      `
      : ""
    }
    </div>
  `;
};

const buildAddress = (locAny: LocationDataVariants): string | undefined => {
  // Check for pre-built address field first
  const direct = getString(locAny.address);
  if (direct && direct.trim().length) return direct;

  // Build ONLY from street lines, never city/state/postal
  return buildStreetAddress(
    getString(locAny.street_address),
    getString(locAny.street_address_second),
  );
};

const pickWebsite = (
  shopAny: ShopDataVariants,
  locAny: LocationDataVariants,
): string | undefined =>
  getString(shopAny.website) ??
  getString(shopAny.websiteUrl) ??
  getString(shopAny.website_url) ??
  getString(locAny.website);

const pickWebsiteUrl = (
  shopAny: ShopDataVariants,
  locAny: LocationDataVariants,
): string | undefined =>
  getString(shopAny.website_url) ??
  getString(shopAny.websiteUrl) ??
  getString(shopAny.website) ??
  getString(locAny.website);

const pickPhone = (
  shopAny: ShopDataVariants,
  locAny: LocationDataVariants,
): string | undefined => getString(shopAny.phone) ?? getString(locAny.phone);

const buildShopPropsFromShopAndLocation = (
  shop: ShopWithUser,
  loc: Location,
  ll: { lng: number; lat: number },
): ShopGeoJsonProperties | null => {
  if (typeof shop.id !== "number") return null;

  const shopAny = shop as unknown as ShopDataVariants;
  const locAny = loc as unknown as LocationDataVariants;

  const categoryIds =
    Array.isArray(shopAny.categoryIds) &&
      shopAny.categoryIds.every((x) => typeof x === "number")
      ? shopAny.categoryIds
      : Array.isArray(shopAny.category_ids) &&
        shopAny.category_ids.every((x) => typeof x === "number")
        ? shopAny.category_ids
        : undefined;

  const address = buildAddress(locAny);

  const phone = pickPhone(shopAny, locAny);
  const website = pickWebsite(shopAny, locAny);
  const website_url = pickWebsiteUrl(shopAny, locAny);

  const locationStatus = loc.locationStatus ?? "open";

  return {
    shopId: shop.id,
    shopName: getShopName(shop),
    categories: getCategoriesString(shop),

    imageUrl: getString(shopAny.imageUrl) ?? getString(shopAny.image_url),
    description:
      getString(shopAny.description) ?? getString(shopAny.shop_description),

    usersAvatarEmail:
      getString(shopAny.usersAvatarEmail) ??
      getString(shopAny.users_avatar_email) ??
      getString(shopAny.user_email),
    usersAvatarId:
      getString(shopAny.usersAvatarId) ??
      getString(shopAny.users_avatar_id) ??
      getString(shopAny.user_avatar_id),

    createdBy:
      getString(shopAny.createdBy) ??
      getString(shopAny.created_by_username) ??
      getString(shopAny.created_by),
    created_by: isNumber(shop.created_by) ? shop.created_by : undefined,

    votes: isNumber(shopAny.votes) ? shopAny.votes : undefined,
    categoryIds,

    address,
    city: getString(locAny.city),
    state: getString(locAny.state),
    postalCode: getString(locAny.postalCode) ?? getString(locAny.postal_code),
    country: getString(locAny.country),

    phone,
    website,
    website_url,

    latitude: ll.lat,
    longitude: ll.lng,

    locationStatus:
      locationStatus === "open" ||
        locationStatus === "temporarily_closed" ||
        locationStatus === "permanently_closed"
        ? locationStatus
        : "open",
    locationId: isNumber(loc.id) ? loc.id : undefined,
  };
};

const buildShopGeoJson = (
  displayedShops: ShopWithUser[],
): ShopFeatureCollection => {
  const features: ShopFeature[] = [];

  for (const shop of displayedShops) {
    if (typeof shop.id !== "number") continue;

    const locs = shop.locations ?? [];
    for (const loc of locs) {
      const ll = getLngLat(loc);
      if (!ll) continue;

      const props = buildShopPropsFromShopAndLocation(shop, loc, ll);
      if (!props) continue;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [ll.lng, ll.lat] },
        properties: props,
      });
    }
  }

  return { type: "FeatureCollection", features };
};

const coercePropsFromFeatureProperties = (
  raw: Record<string, unknown>,
): ShopGeoJsonProperties | null => {
  const shopId = toNumber(raw.shopId);
  if (!shopId) return null;

  const locationStatusRaw = getString(raw.locationStatus);
  const locationStatus:
    | "open"
    | "temporarily_closed"
    | "permanently_closed"
    | undefined =
    locationStatusRaw === "open" ||
      locationStatusRaw === "temporarily_closed" ||
      locationStatusRaw === "permanently_closed"
      ? locationStatusRaw
      : undefined;

  return {
    ...(raw as unknown as ShopGeoJsonProperties),
    shopId,
    shopName: getString(raw.shopName) ?? "",
    categories: getString(raw.categories) ?? "",
    address: getString(raw.address),
    phone: getString(raw.phone),
    website: getString(raw.website),
    website_url: getString(raw.website_url),
    city: getString(raw.city),
    state: getString(raw.state),
    postalCode: getString(raw.postalCode),
    country: getString(raw.country),
    imageUrl: getString(raw.imageUrl),
    description: getString(raw.description),
    usersAvatarEmail: getString(raw.usersAvatarEmail),
    usersAvatarId: getString(raw.usersAvatarId),
    createdBy: getString(raw.createdBy),
    created_by: toNumber(raw.created_by),
    locationStatus,
    locationId: toNumber(raw.locationId),
  };
};

const ensureShopSourceAndLayers = (map: Map, data: ShopFeatureCollection) => {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
  }

  if (!map.getLayer(CLUSTERS_LAYER_ID)) {
    map.addLayer({
      id: CLUSTERS_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": CLUSTER_COLOR,
        "circle-radius": ["step", ["get", "point_count"], 16, 25, 22, 50, 28],
        "circle-opacity": 0.85,
      },
    });
  }

  if (!map.getLayer(CLUSTER_COUNT_LAYER_ID)) {
    map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12,
      },
      paint: {
        "text-color": CLUSTER_TEXT_COLOR,
      },
    });
  }

  if (!map.getLayer(UNCLUSTERED_LAYER_ID)) {
    map.addLayer({
      id: UNCLUSTERED_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": POINT_COLOR,
        "circle-stroke-color": POINT_STROKE_COLOR,
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-opacity": 0.9,
      },
    });
  }
};

type MapBoxProps = {
  isLoggedIn?: boolean;
};

const MapBox = ({ isLoggedIn = true }: MapBoxProps) => {
  const { displayedShops } = useShops();
  const { openSidebar, selectShopById } = useShopSidebar();
  const { theme } = useTheme();
  const { userMetadata } = useAuth();
  const location = useLocation();

  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Load persisted preferences
  const viewerKey = userMetadata?.id ? String(userMetadata.id) : undefined;
  const initialPrefsRef = useRef(loadMapViewPrefs(viewerKey));

  const [center, setCenter] = useState<[number, number]>(
    initialPrefsRef.current?.center ?? INITIAL_CENTER,
  );
  const [zoom, setZoom] = useState<number>(
    initialPrefsRef.current?.zoom ?? INITIAL_ZOOM,
  );
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    initialPrefsRef.current?.userPosition ?? null,
  );

  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  const appliedStyleRef = useRef<string>(
    theme === "dark" ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT,
  );
  const styleSeqRef = useRef(0);

  const loadingCaption = useMemo(() => {
    const index = Math.floor(Math.random() * loadingMessages.length);
    return loadingMessages[index];
  }, []);

  const openSidebarRef = useLatest(openSidebar);
  const userPositionRef = useLatest(userPosition);
  const selectShopByIdRef = useLatest(selectShopById);

  const hoverPopupRef = useRef<mapboxgl.Popup | null>(null);
  const processedDeepLinkRef = useRef<string | null>(null);

  const loadingSeqRef = useRef(0);

  const hideLoadingWhenMapReady = (map: Map, expectedSeq: number) => {
    map.once("idle", () => {
      if (loadingSeqRef.current === expectedSeq) {
        setLoading(false);
      }
    });
  };


  const shopGeoJson: ShopFeatureCollection = useMemo(() => {
    return buildShopGeoJson(displayedShops);
  }, [displayedShops]);

  const shopGeoJsonRef = useLatest(shopGeoJson);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as
      | string
      | undefined;
    if (!token) {
      throw new Error(
        "Missing VITE_MAPBOX_ACCESS_TOKEN in environment variables.",
      );
    }

    mapboxgl.accessToken = token;

    const initialStyle =
      theme === "dark" ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT;
    appliedStyleRef.current = initialStyle;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: initialPrefsRef.current?.center ?? INITIAL_CENTER,
      zoom: initialPrefsRef.current?.zoom ?? INITIAL_ZOOM,
      style: initialStyle,
    });

    mapRef.current = map;

    const onMove = () => {
      const c = map.getCenter();
      setCenter([c.lng, c.lat]);
      setZoom(map.getZoom());
    };

    const closeHoverPopup = () => {
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
    };

    const onLoad = () => {
      setMapLoaded(true);

      ensureShopSourceAndLayers(map, shopGeoJsonRef.current);

      loadingSeqRef.current += 1;
      hideLoadingWhenMapReady(map, loadingSeqRef.current);

      map.on("click", CLUSTERS_LAYER_ID, (e) => {
        stopMapClick(e);

        const feature = e.features?.[0];
        if (!feature) return;

        const props = feature.properties as Record<string, unknown> | undefined;
        const clusterId = props?.cluster_id;
        if (!isNumber(clusterId)) return;

        const src = map.getSource(SOURCE_ID) as GeoJSONSource;
        if (!src || !("getClusterExpansionZoom" in src)) return;

        (
          src as GeoJSONSource & {
            getClusterExpansionZoom: (
              id: number,
              cb: (err: Error | null, zoom: number) => void,
            ) => void;
          }
        ).getClusterExpansionZoom(clusterId, (err, nextZoom) => {
          if (err) return;

          const coords = (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];

          const safeZoom =
            typeof nextZoom === "number" && Number.isFinite(nextZoom)
              ? nextZoom
              : map.getZoom();

          map.easeTo({ center: coords, zoom: safeZoom });
        });
      });

      map.on("click", UNCLUSTERED_LAYER_ID, (e) => {
        stopMapClick(e);

        const feature = e.features?.[0];
        if (!feature) return;

        const raw = (feature.properties ?? {}) as Record<string, unknown>;
        const props = coercePropsFromFeatureProperties(raw);
        if (!props) return;

        closeHoverPopup();
        openSidebarRef.current(props, userPositionRef.current);
      });

      map.on("mouseenter", UNCLUSTERED_LAYER_ID, (e) => {
        map.getCanvas().style.cursor = "pointer";

        const feature = e.features?.[0];
        if (!feature) return;

        const raw = (feature.properties ?? {}) as Record<string, unknown>;
        const props = coercePropsFromFeatureProperties(raw);
        if (!props) return;

        const coords = (feature.geometry as GeoJSON.Point).coordinates as [
          number,
          number,
        ];

        closeHoverPopup();
        hoverPopupRef.current = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
          className: "mapboxPopup",
        })
          .setLngLat(coords)
          .setHTML(buildPopupHtml(props))
          .addTo(map);
      });

      map.on("mouseleave", UNCLUSTERED_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
        closeHoverPopup();
      });

      map.on("mouseenter", CLUSTERS_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTERS_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
    };

    map.on("move", onMove);
    map.on("load", onLoad);

    return () => {
      setMapLoaded(false);
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;

      userMarkerRef.current?.remove();
      userMarkerRef.current = null;

      map.off("load", onLoad);
      map.off("move", onMove);
      map.remove();
      mapRef.current = null;
    };
  }, [openSidebarRef, shopGeoJsonRef, userPositionRef, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!src) return;

    setLoading(true);
    src.setData(shopGeoJson);

    loadingSeqRef.current += 1;
    hideLoadingWhenMapReady(map, loadingSeqRef.current);
  }, [shopGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const desiredStyle =
      theme === "dark" ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT;
    if (appliedStyleRef.current === desiredStyle) return;

    appliedStyleRef.current = desiredStyle;
    styleSeqRef.current += 1;
    const expectedStyleSeq = styleSeqRef.current;

    setLoading(true);

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    map.setStyle(desiredStyle);

    map.once("style.load", () => {
      if (styleSeqRef.current !== expectedStyleSeq) return;

      map.setCenter(currentCenter);
      map.setZoom(currentZoom);

      ensureShopSourceAndLayers(map, shopGeoJsonRef.current);

      const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (src) {
        src.setData(shopGeoJsonRef.current);
      }

      loadingSeqRef.current += 1;
      hideLoadingWhenMapReady(map, loadingSeqRef.current);
    });
  }, [theme, shopGeoJsonRef]);

  useEffect(() => {
    const params = parseDeepLink(location.search);
    if (!params) return;

    const map = mapRef.current;
    if (!mapLoaded || !map) return;

    const { lat, lng, z, shopId } = params;

    const zoomValue = typeof z === "number" && Number.isFinite(z) ? z : 16;

    const paramsKey = `${lat},${lng},${zoomValue},${shopId ?? ""}`;
    if (processedDeepLinkRef.current === paramsKey) return;

    processedDeepLinkRef.current = paramsKey;

    map.flyTo({
      center: [lng, lat],
      zoom: zoomValue,
      essential: true,
    });

    if (typeof shopId === "number" && Number.isFinite(shopId)) {
      selectShopByIdRef.current(shopId, [lng, lat]).catch((error) => {
        console.error("Deep-link navigation failed:", error);
      });
    }
  }, [location.search, mapLoaded, selectShopByIdRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (!userPosition) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = new mapboxgl.Marker()
        .setLngLat(userPosition)
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat(userPosition);
    }
  }, [userPosition, mapLoaded]);

  // Listen for locateUser event from SpeedDial
  useEffect(() => {
    if (!isLoggedIn) return;
    if (!navigator.geolocation) return;

    const handleLocateUser = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition: [number, number] = [
            pos.coords.longitude,
            pos.coords.latitude,
          ];
          setUserPosition(newPosition);

          const map = mapRef.current;
          if (map) {
            map.flyTo({
              center: newPosition,
              zoom: 13,
              essential: true,
            });

            // Save preferences after flying to user location
            try {
              saveMapViewPrefs(
                {
                  center: newPosition,
                  zoom: 13,
                  userPosition: newPosition,
                  ts: Date.now(),
                },
                viewerKey,
              );
            } catch (error) {
              console.error("Error saving map view preferences:", error);
            }
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        },
      );
    };

    window.addEventListener("locateUser", handleLocateUser);

    return () => {
      window.removeEventListener("locateUser", handleLocateUser);
    };
  }, [isLoggedIn, viewerKey]);

  // Save map view preferences on moveend (debounced)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleMoveEnd = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();

        try {
          saveMapViewPrefs(
            {
              center: [currentCenter.lng, currentCenter.lat],
              zoom: currentZoom,
              userPosition,
              ts: Date.now(),
            },
            viewerKey,
          );
        } catch (error) {
          console.error("Error saving map view preferences:", error);
        }
      }, 250);
    };

    map.on("moveend", handleMoveEnd);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      map.off("moveend", handleMoveEnd);
    };
  }, [mapLoaded, userPosition, viewerKey]);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {loading && (
        <div className="absolute top-0 left-0 w-[100vw] h-[100dvh] flex items-center justify-center bg-surface-light dark:bg-surface-dark opacity-75 z-50">
          <GiSandwich className="animate-spin text-[50px] text-brand-primary dark:text-brand-secondary mr-4" />
          <span className="text-brand-primary dark:text-brand-secondary text-md font-semibold">
            {loadingCaption}
          </span>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1,
          padding: "8px 10px",
          borderRadius: 8,
          background: "rgba(0,0,0,0.65)",
          color: "white",
          fontSize: 13,
          lineHeight: 1.3,
        }}
      >
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} |
        Zoom: {zoom.toFixed(2)} | Shops: {shopGeoJson.features.length}
      </div>

      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      <SpeedDial
        onLocateUser={() => {
          window.dispatchEvent(new Event("locateUser"));
        }}
      />
    </div>
  );
};

export default MapBox;
