import { useEffect, useRef } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import SpeedDial from "../Dial/SpeedDial";

const DEFAULT_CENTER: [number, number] = [-74.5, 40];
const DEFAULT_ZOOM = 9;

export interface ShopGeoJsonProperties {
  shopId: number;
  shopName: string;
  address: string;
  description?: string;
  phone?: string;
  website?: string;
  imageUrl?: string;
  categories?: string;
  createdBy?: string;
  usersAvatarId?: string;
  usersAvatarEmail?: string;
  locationOpen?: boolean;
  latitude?: number;
  longitude?: number;
  address_first?: string;
  address_second?: string;
  house_number?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  website_url?: string;
  shop_description?: string;
  categoryIds?: number[];
}

const MapBox = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-left");

    map.on("error", (e) => {
      console.error("Mapbox error:", e.error);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleLocateUser = () => {
      if (!mapRef.current) return;

      if (!navigator.geolocation) {
        console.error("Geolocation is not supported in this browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const center: [number, number] = [
            pos.coords.longitude,
            pos.coords.latitude,
          ];

          mapRef.current?.flyTo({
            center,
            zoom: 14,
            essential: true,
          });
        },
        (err) => {
          console.error("Geolocation error:", err);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000,
        },
      );
    };

    window.addEventListener("locateUser", handleLocateUser);

    return () => {
      window.removeEventListener("locateUser", handleLocateUser);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100dvh" }}>
      <div ref={mapContainerRef} style={{ position: "absolute", inset: 0 }} />

      <SpeedDial
        onLocateUser={() => {
          window.dispatchEvent(new Event("locateUser"));
        }}
      />
    </div>
  );
};

export default MapBox;
