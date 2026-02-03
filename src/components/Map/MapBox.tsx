import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { GeoJSONSource, Map } from "mapbox-gl";
import { GiSandwich } from "react-icons/gi";
import { useLocation } from "react-router-dom";

import "mapbox-gl/dist/mapbox-gl.css";

import { useShops } from "@/context/shopContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@context/authContext";
import { useMap } from "@context/mapContext";
import { parseDeepLink } from "@utils/deepLink";
import { buildCityStateZip } from "@utils/address";
import { loadMapViewPrefs, saveMapViewPrefs } from "@utils/mapViewPrefs";
import {
  buildShopGeoJson,
  coercePropsFromFeatureProperties,
  type ShopFeatureCollection,
  type ShopGeoJsonProperties,
} from "@utils/shopGeoJson";
// import SpeedDial from "../Dial/SpeedDial";

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

const SOURCE_ID = "shops";
const CLUSTERS_LAYER_ID = "shops-clusters";
const CLUSTER_COUNT_LAYER_ID = "shops-cluster-count";
const UNCLUSTERED_LAYER_ID = "shops-unclustered";
const HOVERED_LAYER_ID = "shops-hovered";

const CLUSTER_COLOR = "#DA291C";
const CLUSTER_TEXT_COLOR = "#FFFFFF";
const POINT_COLOR = "#DA291C";
const POINT_STROKE_COLOR = "#5A110C";

const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const useLatest = <T,>(value: T) => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
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
      ${
        street || cityStateZipEscaped
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

  if (!map.getLayer(HOVERED_LAYER_ID)) {
    map.addLayer({
      id: HOVERED_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: [
        "all",
        ["!", ["has", "point_count"]],
        ["==", ["get", "locationId"], -1],
      ],
      paint: {
        "circle-color": "#FFC72C",
        "circle-stroke-color": "#111827",
        "circle-radius": 11,
        "circle-stroke-width": 3,
        "circle-opacity": 0.95,
      },
    });
  }
};

type MapBoxProps = {
  isLoggedIn?: boolean;
};

const MapBox = ({ isLoggedIn = true }: MapBoxProps) => {
  const { displayedShops } = useShops();
  const { openSidebar, selectShopById, selectedShop, sidebarOpen } =
    useShopSidebar();
  const { theme } = useTheme();
  const { userMetadata } = useAuth();
  const {
    flyToTrigger,
    setUserPosition: setUserPositionInContext,
    setPendingCenterCoords,
    hoveredLocationId,
    setIsNearbyOpen,
    setCenter: setContextCenter,
    setZoom: setContextZoom,
  } = useMap();
  const location = useLocation();

  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Refs for tracking rehydration and suppressing programmatic saves
  const hydratedKeyRef = useRef<string | null>(null);
  const suppressNextSaveRef = useRef(0);

  // Make viewerKey always explicit (no undefined)
  const viewerKey = userMetadata?.id ? String(userMetadata.id) : "anon";

  // Load persisted preferences
  const initialPrefs = useMemo(() => loadMapViewPrefs(viewerKey), [viewerKey]);

  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    () => initialPrefs?.userPosition ?? null,
  );
  useEffect(() => {
    setUserPositionInContext(userPosition);
  }, [userPosition, setUserPositionInContext]);

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
  const hoveredLocationIdRef = useLatest(hoveredLocationId);

  const hoverPopupRef = useRef<mapboxgl.Popup | null>(null);
  const selectedPopupRef = useRef<mapboxgl.Popup | null>(null);
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
      center: initialPrefs?.center ?? INITIAL_CENTER,
      zoom: initialPrefs?.zoom ?? INITIAL_ZOOM,
      style: initialStyle,
    });

    mapRef.current = map;

    const closeHoverPopup = () => {
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
    };

    const onLoad = () => {
      setMapLoaded(true);

      ensureShopSourceAndLayers(map, shopGeoJsonRef.current);

      const initialCenter = map.getCenter();
      setPendingCenterCoords([initialCenter.lng, initialCenter.lat]);
      setContextCenter([initialCenter.lng, initialCenter.lat]);
      setContextZoom(map.getZoom());

      if (map.getLayer(HOVERED_LAYER_ID)) {
        map.setFilter(HOVERED_LAYER_ID, [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "locationId"], hoveredLocationIdRef.current ?? -1],
        ]);
      }

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

          suppressNextSaveRef.current += 1;
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
        setIsNearbyOpen(false);
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

    map.on("load", onLoad);

    return () => {
      setMapLoaded(false);
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
      selectedPopupRef.current?.remove();
      selectedPopupRef.current = null;

      userMarkerRef.current?.remove();
      userMarkerRef.current = null;

      map.off("load", onLoad);
      map.remove();
      mapRef.current = null;
    };
  }, [
    openSidebarRef,
    shopGeoJsonRef,
    userPositionRef,
    theme,
    setContextCenter,
    setContextZoom,
    setPendingCenterCoords,
    setIsNearbyOpen,
    hoveredLocationIdRef,
    initialPrefs,
  ]);

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

      suppressNextSaveRef.current += 1;
      map.setCenter(currentCenter);
      map.setZoom(currentZoom);

      ensureShopSourceAndLayers(map, shopGeoJsonRef.current);
      if (map.getLayer(HOVERED_LAYER_ID)) {
        map.setFilter(HOVERED_LAYER_ID, [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "locationId"], hoveredLocationIdRef.current ?? -1],
        ]);
      }

      const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (src) {
        src.setData(shopGeoJsonRef.current);
      }

      loadingSeqRef.current += 1;
      hideLoadingWhenMapReady(map, loadingSeqRef.current);
    });
  }, [theme, shopGeoJsonRef, hoveredLocationIdRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (!sidebarOpen || !selectedShop) {
      selectedPopupRef.current?.remove();
      selectedPopupRef.current = null;
      return;
    }

    const lng = selectedShop.longitude;
    const lat = selectedShop.latitude;

    if (
      typeof lng !== "number" ||
      typeof lat !== "number" ||
      !Number.isFinite(lng) ||
      !Number.isFinite(lat)
    ) {
      selectedPopupRef.current?.remove();
      selectedPopupRef.current = null;
      return;
    }

    const html = buildPopupHtml(selectedShop);

    if (!selectedPopupRef.current) {
      selectedPopupRef.current = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        className: "mapboxPopup",
      })
        .setLngLat([lng, lat])
        .setHTML(html)
        .addTo(map);
    } else {
      selectedPopupRef.current.setLngLat([lng, lat]).setHTML(html);
    }
  }, [sidebarOpen, selectedShop, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (!map.getLayer(HOVERED_LAYER_ID)) return;

    const hoveredId = hoveredLocationId ?? -1;
    map.setFilter(HOVERED_LAYER_ID, [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "locationId"], hoveredId],
    ]);
  }, [hoveredLocationId, mapLoaded]);

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

    suppressNextSaveRef.current += 1;
    map.flyTo({
      center: [lng, lat],
      zoom: zoomValue,
      essential: true,
    });
    setIsNearbyOpen(false);

    if (typeof shopId === "number" && Number.isFinite(shopId)) {
      selectShopByIdRef.current(shopId, [lng, lat]).catch((error) => {
        console.error("Deep-link navigation failed:", error);
      });
    }
  }, [location.search, mapLoaded, selectShopByIdRef, setIsNearbyOpen]);

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
          setUserPositionInContext(newPosition);

          const map = mapRef.current;
          if (map) {
            suppressNextSaveRef.current += 1;
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
  }, [isLoggedIn, viewerKey, setUserPositionInContext]);

  // Handle flyToLocation trigger from context
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (!flyToTrigger) return;

    suppressNextSaveRef.current += 1;
    map.flyTo({
      center: [flyToTrigger.lng, flyToTrigger.lat],
      zoom: flyToTrigger.zoom,
      essential: true,
    });
  }, [flyToTrigger, mapLoaded]);

  // Rehydrate when viewerKey becomes known
  useEffect(() => {
    const map = mapRef.current;
    if (!mapLoaded || !map) return;

    if (hydratedKeyRef.current === viewerKey) return;
    hydratedKeyRef.current = viewerKey;

    const prefs = loadMapViewPrefs(viewerKey);
    if (!prefs) return;

    suppressNextSaveRef.current += 1;
    map.jumpTo({ center: prefs.center, zoom: prefs.zoom });
    setUserPosition(prefs.userPosition ?? null);
    setContextCenter(prefs.center);
    setContextZoom(prefs.zoom);
    setUserPositionInContext(prefs.userPosition ?? null);
    setPendingCenterCoords([prefs.center[0], prefs.center[1]]);
  }, [
    viewerKey,
    mapLoaded,
    setContextCenter,
    setContextZoom,
    setPendingCenterCoords,
    setUserPositionInContext,
  ]);

  // Save map view preferences on moveend (debounced)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleMoveEnd = () => {
      const c = map.getCenter();
      const z = map.getZoom();

      setPendingCenterCoords([c.lng, c.lat]);
      setContextCenter([c.lng, c.lat]);
      setContextZoom(z);

      if (suppressNextSaveRef.current > 0) {
        suppressNextSaveRef.current -= 1;
        return;
      }

      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const c2 = map.getCenter();
        const z2 = map.getZoom();

        try {
          saveMapViewPrefs(
            {
              center: [c2.lng, c2.lat],
              zoom: z2,
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
      if (timeoutId) clearTimeout(timeoutId);
      map.off("moveend", handleMoveEnd);
    };
  }, [
    mapLoaded,
    userPosition,
    viewerKey,
    setPendingCenterCoords,
    setContextCenter,
    setContextZoom,
  ]);

  return (
    <div id="mapbox-root" style={{ position: "fixed", inset: 0 }}>
      {loading && (
        <div className="absolute top-0 left-0 w-[100vw] h-[100dvh] flex items-center justify-center bg-surface-light dark:bg-surface-dark opacity-75 z-50">
          <GiSandwich className="animate-spin text-[50px] text-brand-primary dark:text-brand-secondary mr-4" />
          <span className="text-brand-primary dark:text-brand-secondary text-md font-semibold">
            {loadingCaption}
          </span>
        </div>
      )}

      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* <SpeedDial
        onLocateUser={() => {
          window.dispatchEvent(new Event("locateUser"));
        }}
      /> */}
    </div>
  );
};

export default MapBox;
