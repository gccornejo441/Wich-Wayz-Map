import { useState, useEffect, useRef } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import { useShops } from "../../context/shopContext";
import SpeedDial from "../Dial/SpeedDial";
import { useMap as useMapContext } from "../../context/mapContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { FaSpinner } from "react-icons/fa";

const DEFAULT_POSITION: [number, number] = [-74.006, 40.7128]; // NYC
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

      const el = document.createElement("div");
      el.className = "custom-marker";
      el.title = shopName;
      el.style.cssText =
        "width:30px;height:40px;background:url('/sandwich-pin-v2.svg') center/cover no-repeat;cursor:pointer;";

      el.addEventListener("click", () => {
        openSidebar(feature.properties, position);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat(coordinates as [number, number])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family:Arial;padding:6px;max-width:240px;">
            <h2 style="margin:0 0 6px;font-size:18px;color:#DA291C;">${shopName}</h2>
            <p style="margin:0;font-size:14px;color:#555;">${address}</p>
          </div>`),
        )
        .addTo(map);

      markersRef.current.push(marker);

      if (index === array.length - 1) {
        setTimeout(() => setLoading(false), 400);
      }
    });
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.longitude, pos.coords.latitude]),
        () => setPosition(DEFAULT_POSITION),
      );
    } else {
      setPosition(DEFAULT_POSITION);
    }
  }, []);

  useEffect(() => {
    if (!position || !mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    mapboxgl.accessToken = mapboxAccessToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: position,
      zoom: mapZoom,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-left");

    map.on("load", () => {
      renderCustomMarkers(map);
      setMapLoaded(true);
    });

    mapRef.current = map;
  }, [position, mapboxAccessToken, mapZoom]);

  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      renderCustomMarkers(mapRef.current);
    }
  }, [displayedShops, mapLoaded]);

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.flyTo({ center, zoom: 16, essential: true });
    }
  }, [center]);

  useEffect(() => () => clearMarkers(), []);

  return (
    <div>
      {loading && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white bg-opacity-75 z-50">
          <FaSpinner className="animate-spin text-primary text-4xl" />
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
