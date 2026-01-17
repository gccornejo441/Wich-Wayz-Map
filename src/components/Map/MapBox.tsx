import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl, { Map as MapboxMap } from "mapbox-gl";
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

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
};

const MapBox = () => {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const navigationControlRef = useRef<mapboxgl.NavigationControl | null>(null);

  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const selectedMarkerIdRef = useRef<string | null>(null);
  const positionRef = useRef<Coordinates | null>(null);

  const { displayedShops } = useShops();
  const { zoom, center } = useMapContext();
  const { openSidebar } = useShopSidebar();
  const mapZoom = zoom ?? 13;

  const isCoarsePointer = useMediaQuery("(pointer: coarse)");
  const isMobile = useMediaQuery("(max-width: 767px)");

  const setSelectedMarkerIdSynced = useCallback((id: string | null) => {
    selectedMarkerIdRef.current = id;
    setSelectedMarkerId(id);
  }, []);

  useEffect(() => {
    selectedMarkerIdRef.current = selectedMarkerId;
  }, [selectedMarkerId]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const loadingCaption = useMemo(() => {
    const index = Math.floor(Math.random() * loadingMessages.length);
    return loadingMessages[index];
  }, []);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  const ensurePopup = useCallback(() => {
    if (popupRef.current) popupRef.current.remove();

    popupRef.current = new mapboxgl.Popup({
      offset: 25,
      closeButton: false,
      closeOnClick: false,
      closeOnMove: false,
      maxWidth: isMobile ? "280px" : "320px",
      anchor: "bottom",
      className: "mapboxPopup",
    });
  }, [isMobile]);

  const closePopup = useCallback(() => {
    if (popupRef.current) popupRef.current.remove();
  }, []);

  const showPopup = useCallback(
    (coords: Coordinates, props: ShopGeoJsonProperties) => {
      const map = mapRef.current;
      const popup = popupRef.current;
      if (!map || !popup) return;

      const popupHTML = `
        <div style="pointer-events:none;" class="bg-surface-light dark:bg-surface-dark text-sm rounded-lg max-w-xs -m-3 -mb-5 p-3 animate-fadeIn transition-sidebar">
          <h2 class="text-base font-bold text-brand-primary dark:text-brand-secondary">${props.shopName}</h2>
          <p class="text-text-base dark:text-text-inverted">${props.address}</p>
        </div>
      `;

      popup.setLngLat(coords).setHTML(popupHTML).addTo(map);
    },
    [],
  );

  const updateNavigationControl = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (navigationControlRef.current) {
      map.removeControl(navigationControlRef.current);
      navigationControlRef.current = null;
    }

    const control = new mapboxgl.NavigationControl();
    map.addControl(control, isMobile ? "top-right" : "bottom-left");
    navigationControlRef.current = control;
  }, [isMobile]);

  const createGeoJsonData = useCallback((): GeoJSON.FeatureCollection<
    GeoJSON.Point,
    ShopGeoJsonProperties
  > => {
    const features = displayedShops.flatMap(
      (shop) =>
        shop.locations?.map((location) => ({
          type: "Feature" as const,
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
            coordinates: [location.longitude, location.latitude] as Coordinates,
          },
        })) || [],
    );

    return { type: "FeatureCollection", features };
  }, [displayedShops]);

  const renderCustomMarkers = useCallback(
    (map: MapboxMap) => {
      setLoading(true);
      clearMarkers();
      closePopup();
      setSelectedMarkerIdSynced(null);

      const geojson = createGeoJsonData();

      if (geojson.features.length === 0) {
        setLoading(false);
        return;
      }

      geojson.features.forEach((feature, index, array) => {
        const coordinates = feature.geometry.coordinates as Coordinates;
        const props = feature.properties;
        const markerId = `marker-${props.shopId}-${coordinates[0]}-${coordinates[1]}`;

        const el = document.createElement("div");
        el.className = "custom-marker";
        el.title = props.shopName;

        const hitW = isMobile || isCoarsePointer ? 44 : 30;
        const hitH = isMobile || isCoarsePointer ? 44 : 40;

        el.style.cssText = `
          width:${hitW}px;
          height:${hitH}px;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          position:relative;
          touch-action:manipulation;
        `;

        const iconEl = document.createElement("div");
        iconEl.style.cssText = `
          width:30px;
          height:40px;
          background:url('/sandwich-pin-v2.svg') center/cover no-repeat;
          pointer-events:none;
        `;
        el.appendChild(iconEl);

        if (!isCoarsePointer) {
          el.addEventListener("mouseenter", () => {
            if (selectedMarkerIdRef.current === markerId) return;
            showPopup(coordinates, props);
          });

          el.addEventListener("mouseleave", () => {
            if (selectedMarkerIdRef.current === markerId) return;
            closePopup();
          });
        }

        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (isCoarsePointer) {
            if (selectedMarkerIdRef.current === markerId) {
              closePopup();
              setSelectedMarkerIdSynced(null);
              openSidebar(props, positionRef.current);
              return;
            }

            setSelectedMarkerIdSynced(markerId);
            showPopup(coordinates, props);
            return;
          }

          closePopup();
          setSelectedMarkerIdSynced(null);
          openSidebar(props, positionRef.current);
        });

        const marker = new mapboxgl.Marker(el).setLngLat(coordinates).addTo(map);
        markersRef.current.push(marker);

        if (index === array.length - 1) {
          setTimeout(() => setLoading(false), 200);
        }
      });
    },
    [
      clearMarkers,
      closePopup,
      createGeoJsonData,
      isCoarsePointer,
      isMobile,
      openSidebar,
      setSelectedMarkerIdSynced,
      showPopup,
    ],
  );

  useEffect(() => {
    const resolvePosition = () => {
      if (!navigator.geolocation) {
        setPosition(DEFAULT_POSITION);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.longitude, pos.coords.latitude]),
        () => setPosition(DEFAULT_POSITION),
      );
    };

    resolvePosition();

    const locateUserListener = () => resolvePosition();
    window.addEventListener("locateUser", locateUserListener);

    return () => {
      window.removeEventListener("locateUser", locateUserListener);
    };
  }, []);

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
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      touchZoomRotate: true,
    });

    mapRef.current = map;

    ensurePopup();

    map.on("load", () => {
      updateNavigationControl();

      map.on("click", () => {
        closePopup();
        setSelectedMarkerIdSynced(null);
      });

      renderCustomMarkers(map);
      setMapLoaded(true);
    });

    return () => {
      closePopup();

      if (navigationControlRef.current) {
        map.removeControl(navigationControlRef.current);
        navigationControlRef.current = null;
      }

      map.remove();
      mapRef.current = null;
    };
  }, [
    closePopup,
    ensurePopup,
    mapboxAccessToken,
    mapZoom,
    position,
    renderCustomMarkers,
    setSelectedMarkerIdSynced,
    updateNavigationControl,
  ]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    ensurePopup();
    updateNavigationControl();
  }, [ensurePopup, isMobile, mapLoaded, updateNavigationControl]);

  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      renderCustomMarkers(mapRef.current);
    }
  }, [displayedShops, mapLoaded, renderCustomMarkers]);

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

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.flyTo({ center, zoom: 16, essential: true });
    }
  }, [center]);

  useEffect(() => {
    return () => clearMarkers();
  }, [clearMarkers]);

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
