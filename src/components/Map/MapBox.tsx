import { useState, useEffect, useRef } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import { useShops } from "../../context/shopContext";
import SpeedDial from "../Dial/SpeedDial";
import { useMap as useMapContext } from "../../context/mapContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";

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

  const [position, setPosition] = useState<Coordinates | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { shops } = useShops();
  const { zoom } = useMapContext();
  const { openSidebar } = useShopSidebar();
  const mapZoom = zoom ?? 13;

  // Get user's geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.longitude, pos.coords.latitude]);
        },
        () => setPosition(DEFAULT_POSITION),
      );
    } else {
      setPosition(DEFAULT_POSITION);
    }
  }, []);

  // Initialize the Map
  useEffect(() => {
    if (!position || !mapContainerRef.current) return;

    // Remove any existing map instance
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

  // Update markers on shop data change after the map has loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      renderCustomMarkers(mapRef.current);
    }
  }, [shops, mapLoaded]);

  // Function to render custom shop markers
  const renderCustomMarkers = (map: Map) => {
    const geojson = createGeoJsonData();

    const existingMarkers = document.querySelectorAll(".custom-marker");
    existingMarkers.forEach((el) => el.remove());

    geojson.features.forEach((feature) => {
      const { coordinates } = feature.geometry;
      const { shopName, address } = feature.properties;

      const markerElement = document.createElement("div");
      markerElement.className = "custom-marker";
      markerElement.style.width = "30px";
      markerElement.style.height = "40px";
      markerElement.style.backgroundImage = "url('/sandwich-pin-v2.svg')";
      markerElement.style.backgroundSize = "cover";
      markerElement.style.backgroundPosition = "center";
      markerElement.style.backgroundRepeat = "no-repeat";
      markerElement.style.cursor = "pointer";

      markerElement.addEventListener("click", () => {
        openSidebar(feature.properties, position);
      });

      new mapboxgl.Marker(markerElement)
        .setLngLat(coordinates as [number, number])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="font-family: Arial, sans-serif; padding: 10px; border-radius: 8px; background: #fff;">
              <h2 style="margin: 0 0 8px; color: #DA291C;">${shopName}</h2>
              <p style="margin: 0; color: #333; font-size: 14px;">${address}</p>
            </div>
          `),
        )
        .addTo(map);
    });
  };

  // Function to create GeoJSON data from shops
  const createGeoJsonData = (): GeoJSON.FeatureCollection<
    GeoJSON.Point,
    ShopGeoJsonProperties
  > => {
    return {
      type: "FeatureCollection",
      features: shops.flatMap(
        (shop) =>
          shop.locations?.map((location) => ({
            type: "Feature",
            properties: {
              shopId: shop.id ?? 1,
              shopName: shop.name,
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
                shop.categories
                  ?.map((category) => category.category_name)
                  .join(", ") || "No categories available",
              usersAvatarId: shop.users_avatar_id,
              locationOpen: location.location_open,
            },
            geometry: {
              type: "Point",
              coordinates: [
                location.longitude,
                location.latitude,
              ] as Coordinates,
            },
          })) || [],
      ),
    };
  };

  return (
    <div>
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
          const event = new Event("locateUser");
          window.dispatchEvent(event);
        }}
      />
    </div>
  );
};

export default MapBox;
