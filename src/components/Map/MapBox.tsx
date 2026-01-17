import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl, { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import { useShops } from "../../context/shopContext";
import SpeedDial from "../Dial/SpeedDial";
import { useMap as useMapContext } from "../../context/mapContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { GiSandwich } from "react-icons/gi";

const DEFAULT_POSITION: [number, number] = [-74.006, 40.7128];
type Coordinates = [number, number];

export interface ShopGeoJsonProperties {
  shopId: number;
  shopName: string;
  address: string;
  description?: string;
  createdBy: string;
  categories?: string;
  usersAvatarId?: string;
  usersAvatarEmail?: string;
  locationOpen?: boolean;
  phone?: string;
  website?: string;
  imageUrl?: string;
}

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

// Custom hook for reactive media queries
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
};

const MapBox = () => {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const navigationControlRef = useRef<mapboxgl.NavigationControl | null>(null);

  // Refs to avoid stale closures in event listeners
  const selectedFeatureIdRef = useRef<string | null>(null);
  const positionRef = useRef<Coordinates | null>(null);

  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null,
  );

  const { displayedShops } = useShops();
  const { zoom, center } = useMapContext();
  const { openSidebar } = useShopSidebar();
  const mapZoom = zoom ?? 13;

  // Reactive media queries
  const isCoarsePointer = useMediaQuery("(pointer: coarse)");
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Helper to update both state and ref
  const setSelectedFeatureIdSynced = useCallback((id: string | null) => {
    selectedFeatureIdRef.current = id;
    setSelectedFeatureId(id);
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    selectedFeatureIdRef.current = selectedFeatureId;
  }, [selectedFeatureId]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const loadingCaption = useMemo(() => {
    const index = Math.floor(Math.random() * loadingMessages.length);
    return loadingMessages[index];
  }, []);

  // Create GeoJSON with stable feature IDs
  const createGeoJsonData = useCallback((): GeoJSON.FeatureCollection<
    GeoJSON.Point,
    ShopGeoJsonProperties
  > => {
    const features = displayedShops.flatMap(
      (shop) =>
        shop.locations?.map((location) => {
          const lng = location.longitude;
          const lat = location.latitude;
          const featureId = `marker-${shop.id ?? 1}-${lng}-${lat}`;

          return {
            type: "Feature" as const,
            id: featureId,
            properties: {
              shopId: shop.id ?? 1,
              shopName: shop.name,
              description: shop.description || "No description available",
              address: [
                location.street_address || "Address not available",
                location.street_address_second || null,
                location.postal_code || "",
                location.city || "",
                location.state || "",
              ]
                .filter(Boolean)
                .join(", "),
              createdBy: shop.created_by_username || "admin",
              categories:
                shop.categories?.map((c) => c.category_name).join(", ") ||
                "No categories available",
              usersAvatarId: shop.users_avatar_id,
              locationOpen:
                location.location_open === undefined
                  ? undefined
                  : Number(location.location_open) === 1,
              website: location.website || "No website available",
              phone: location.phone || "No phone number available",
            },
            geometry: {
              type: "Point" as const,
              coordinates: [lng, lat] as Coordinates,
            },
          };
        }) || [],
    );

    return {
      type: "FeatureCollection",
      features,
    };
  }, [displayedShops]);

  // Initialize or update popup with current mobile state
  const ensurePopup = useCallback(() => {
    if (popupRef.current) {
      popupRef.current.remove();
    }
    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      closeOnMove: false,
      maxWidth: isMobile ? "280px" : "320px",
      anchor: "bottom",
      offset: 25,
      className: "mapboxPopup",
    });
  }, [isMobile]);

  // Show popup with shop details
  const showPopup = useCallback(
    (coordinates: Coordinates, properties: ShopGeoJsonProperties) => {
      if (!mapRef.current || !popupRef.current) return;

      const popupHTML = `
        <div class="bg-surface-light dark:bg-surface-dark text-sm rounded-lg max-w-xs -m-3 -mb-5 p-3 animate-fadeIn transition-sidebar">
          <h2 class="text-base font-bold text-brand-primary dark:text-brand-secondary">${properties.shopName}</h2>
          <p class="text-text-base dark:text-text-inverted">${properties.address}</p>
        </div>
      `;

      popupRef.current
        .setLngLat(coordinates)
        .setHTML(popupHTML)
        .addTo(mapRef.current);
    },
    [],
  );

  // Close popup
  const closePopup = useCallback(() => {
    if (popupRef.current) {
      popupRef.current.remove();
    }
  }, []);

  // Update navigation control position based on screen size
  const updateNavigationControl = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing control
    if (navigationControlRef.current) {
      map.removeControl(navigationControlRef.current);
    }

    // Add new control at appropriate position
    const control = new mapboxgl.NavigationControl();
    const position = isMobile ? "top-right" : "bottom-left";
    map.addControl(control, position);
    navigationControlRef.current = control;
  }, [isMobile]);

  // Setup map layers and source
  const setupMapLayers = useCallback(
    (map: MapboxMap) => {
      const geojson = createGeoJsonData();

      // Add source with clustering
      map.addSource("shops", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "shops",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#FFC72C", // yellow for small clusters
            10,
            "#DA291C", // red for medium clusters
            30,
            "#5A110C", // dark red for large clusters
          ],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 25, 30, 30],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
        },
      });

      // Cluster count labels
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "shops",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 14,
        },
        paint: {
          "text-color": "#FFFFFF",
        },
      });

      // Unclustered points
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "shops",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#DA291C",
          "circle-radius": isMobile ? 10 : 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
        },
      });

      // Interaction: Cluster click
      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource("shops") as GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (
            err ||
            !features[0].geometry ||
            features[0].geometry.type !== "Point"
          )
            return;

          map.easeTo({
            center: features[0].geometry.coordinates as Coordinates,
            zoom: zoom ?? (mapRef.current?.getZoom() ?? 13) + 2,
          });
        });
      });

      // Interaction: Unclustered point click
      map.on("click", "unclustered-point", (e) => {
        if (!e.features || !e.features.length) return;

        const feature = e.features[0];
        const featureId = feature.id as string;
        const properties =
          feature.properties as unknown as ShopGeoJsonProperties;
        const geometry = feature.geometry;

        if (geometry.type !== "Point") return;

        const coordinates = geometry.coordinates as Coordinates;

        // Mobile: first tap shows popup, second tap opens sidebar
        if (isCoarsePointer) {
          if (selectedFeatureIdRef.current === featureId) {
            // Second tap: open sidebar
            closePopup();
            setSelectedFeatureIdSynced(null);
            openSidebar(properties, positionRef.current);
          } else {
            // First tap: show popup
            setSelectedFeatureIdSynced(featureId);
            showPopup(coordinates, properties);
          }
        } else {
          // Desktop: click opens sidebar immediately
          closePopup();
          setSelectedFeatureIdSynced(null);
          openSidebar(properties, positionRef.current);
        }
      });

      // Desktop hover behavior
      if (!isCoarsePointer) {
        map.on("mouseenter", "unclustered-point", (e) => {
          map.getCanvas().style.cursor = "pointer";

          if (!e.features || !e.features.length) return;

          const feature = e.features[0];
          const featureId = feature.id as string;

          // Don't show hover popup if feature is selected
          if (selectedFeatureIdRef.current === featureId) return;

          const properties =
            feature.properties as unknown as ShopGeoJsonProperties;
          const geometry = feature.geometry;

          if (geometry.type === "Point") {
            showPopup(geometry.coordinates as Coordinates, properties);
          }
        });

        map.on("mouseleave", "unclustered-point", () => {
          map.getCanvas().style.cursor = "";
          // Only close if not selected
          if (!selectedFeatureIdRef.current) {
            closePopup();
          }
        });

        map.on("mouseenter", "clusters", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "clusters", () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // Map background click: close popup and clear selection
      map.on("click", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["unclustered-point", "clusters"],
        });

        // Only clear if not clicking a feature
        if (!features.length) {
          closePopup();
          setSelectedFeatureIdSynced(null);
        }
      });

      setLoading(false);
    },
    [
      createGeoJsonData,
      isMobile,
      isCoarsePointer,
      closePopup,
      showPopup,
      setSelectedFeatureIdSynced,
      openSidebar,
    ],
  );

  // Update source data when displayedShops changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current;
    const source = map.getSource("shops") as GeoJSONSource;

    if (source) {
      const geojson = createGeoJsonData();
      source.setData(geojson);

      // Clear selection if no features
      if (geojson.features.length === 0) {
        closePopup();
        setSelectedFeatureIdSynced(null);
      }
    }
  }, [
    displayedShops,
    mapLoaded,
    createGeoJsonData,
    closePopup,
    setSelectedFeatureIdSynced,
  ]);

  // Recreate popup when isMobile changes
  useEffect(() => {
    if (mapLoaded) {
      ensurePopup();
    }
  }, [isMobile, mapLoaded, ensurePopup]);

  // Update navigation control position when isMobile changes
  useEffect(() => {
    if (mapLoaded) {
      updateNavigationControl();
    }
  }, [isMobile, mapLoaded, updateNavigationControl]);

  // Resolve initial position and listen for "locateUser" event
  useEffect(() => {
    const resolvePosition = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setPosition([pos.coords.longitude, pos.coords.latitude]),
          () => setPosition(DEFAULT_POSITION),
        );
      } else {
        setPosition(DEFAULT_POSITION);
      }
    };

    resolvePosition();

    const locateUserListener = () => resolvePosition();
    window.addEventListener("locateUser", locateUserListener);

    return () => {
      window.removeEventListener("locateUser", locateUserListener);
    };
  }, []);

  // Initialize map once position is available
  useEffect(() => {
    if (!position || !mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const isDarkMode = document.documentElement.classList.contains("dark");

    mapboxgl.accessToken = mapboxAccessToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: isDarkMode
        ? "mapbox://styles/mapbox/navigation-night-v1"
        : "mapbox://styles/mapbox/streets-v12",
      center: position,
      zoom: mapZoom,
      // Mobile-optimized interaction settings
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      touchZoomRotate: true,
    });

    ensurePopup();
    updateNavigationControl();

    map.on("load", () => {
      setupMapLayers(map);
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [
    position,
    mapboxAccessToken,
    mapZoom,
    setupMapLayers,
    ensurePopup,
    updateNavigationControl,
  ]);

  // Handle dark mode theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      if (mapRef.current) {
        mapRef.current.setStyle(
          isDark
            ? "mapbox://styles/mapbox/navigation-night-v1"
            : "mapbox://styles/mapbox/streets-v12",
        );
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Handle center fly-to behavior
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.flyTo({ center, zoom: 16, essential: true });
    }
  }, [center]);

  return (
    <div>
      {loading && (
        <div className="absolute top-0 left-0 w-[100vw] h-[100dvh] flex items-center justify-center bg-surface-light dark:bg-surface-dark opacity-75 z-50">
          <GiSandwich className="animate-spin text-[50px] text-brand-primary dark:text-brand-secondary mr-4" />
          <span className="text-brand-primary dark:text-brand-secondary text-md font-semibold">
            {loadingCaption}
          </span>
        </div>
      )}
      <div
        ref={mapContainerRef}
        style={{
          height: "100dvh",
          width: "100vw",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
      <SpeedDial
        onLocateUser={() => {
          window.dispatchEvent(new Event("locateUser"));
        }}
      />
    </div>
  );
};

export default MapBox;
