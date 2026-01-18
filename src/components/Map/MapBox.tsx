import { useEffect, useRef, useState } from "react";
import mapboxgl, { Map } from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";

const INITIAL_CENTER: [number, number] = [-74.0242, 40.6941];
const INITIAL_ZOOM = 10.12;

export type ShopGeoJsonProperties = {
  shopId: number;
  shopName: string;

  imageUrl?: string;
  description?: string;

  categories: string;

  usersAvatarEmail?: string;
  usersAvatarId?: string;

  createdBy?: string;

  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  latitude?: number;
  longitude?: number;

  website?: string;
  phone?: string;

  votes?: number;

  [key: string]: unknown;
};

const MapBox = () => {
  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [center, setCenter] = useState<[number, number]>(INITIAL_CENTER);
  const [zoom, setZoom] = useState<number>(INITIAL_ZOOM);

  useEffect(() => {
    if (mapRef.current) return;
    if (!mapContainerRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
    if (!token) {
      throw new Error("Missing VITE_MAPBOX_ACCESS_TOKEN in environment variables.");
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      style: "mapbox://styles/mapbox/streets-v12",
    });

    mapRef.current = map;

    const onMove = () => {
      const c = map.getCenter();
      setCenter([c.lng, c.lat]);
      setZoom(map.getZoom());
    };

    map.on("move", onMove);

    return () => {
      map.off("move", onMove);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
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
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} | Zoom:{" "}
        {zoom.toFixed(2)}
      </div>

      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default MapBox;
