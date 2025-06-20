import { useState, useEffect, useRef, useMemo } from "react";
import mapboxgl, { Map } from "mapbox-gl";
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

const MapBox = () => {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { displayedShops } = useShops();
  const { zoom, center } = useMapContext();
  const { openSidebar } = useShopSidebar();
  const mapZoom = zoom ?? 13;

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  };

  const loadingCaption = useMemo(() => {
    const index = Math.floor(Math.random() * loadingMessages.length);
    return loadingMessages[index];
  }, []);

  const createGeoJsonData = (): GeoJSON.FeatureCollection<
    GeoJSON.Point,
    ShopGeoJsonProperties
  > => ({
    type: "FeatureCollection",
    features: displayedShops.flatMap((shop) =>
      shop.locations?.map((location) => ({
        type: "Feature",
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
          type: "Point",
          coordinates: [location.longitude, location.latitude] as Coordinates,
        },
      })) || [],
    ),
  });

  const renderCustomMarkers = (map: Map) => {
    setLoading(true);
    clearMarkers();

    const geojson = createGeoJsonData();

    geojson.features.forEach((feature, index, array) => {
      const { coordinates } = feature.geometry;
      const { shopName, address } = feature.properties;
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        className: "mapboxPopup"
      });

      const el = document.createElement("div");
      el.className = "custom-marker";
      el.title = shopName;
      el.style.cssText =
        "width:30px;height:40px;background:url('/sandwich-pin-v2.svg') center/cover no-repeat;cursor:pointer;";

      el.addEventListener("mouseenter", () => {
        popup
          .setLngLat(coordinates as [number, number])
          .setHTML(`
            <div class="bg-surface-light dark:bg-surface-dark text-sm rounded-lg max-w-xs -m-3 -mb-5 p-3 animate-fadeIn transition-sidebar">
              <h2 class="text-base font-bold text-brand-primary dark:text-brand-secondary ">${shopName}</h2>
              <p class="text-text-base dark:text-text-inverted">${address}</p>
            </div>
          `)
          .addTo(map);
      });

      el.addEventListener("mouseleave", () => popup.remove());

      el.addEventListener("click", () => {
        openSidebar(feature.properties, position);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat(coordinates as [number, number])
        .addTo(map);

      markersRef.current.push(marker);

      if (index === array.length - 1) {
        setTimeout(() => setLoading(false), 400);
      }
    });
  };

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
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-left");

    map.on("load", () => {
      renderCustomMarkers(map);
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [position, mapboxAccessToken, mapZoom]);

  // Re-render markers when displayed shops update
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      renderCustomMarkers(mapRef.current);
    }
  }, [displayedShops, mapLoaded]);

  // Handle dark mode theme changes and center fly-to behavior
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

  // Cleanup markers on unmount
  useEffect(() => {
    return () => clearMarkers();
  }, []);

  return (
    <div>
      {loading && (
        <div className="absolute top-0 left-0 w-[100vw] h-[100vh] flex items-center justify-center bg-surface-light dark:bg-surface-dark opacity-75 z-50">
          <GiSandwich className="animate-spin text-[50px] text-brand-primary dark:text-brand-secondary mr-4" />
          <span className="text-brand-primary dark:text-brand-secondary text-md font-semibold">
            {loadingCaption}
          </span>
        </div>
      )}
      <div
        ref={mapContainerRef}
        style={{
          height: "100vh",
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
