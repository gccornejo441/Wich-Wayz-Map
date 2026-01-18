import { useEffect, useRef } from "react";
import mapboxgl, { Map } from "mapbox-gl";

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

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapContainerRef} className="map-container" />;
};

export default MapBox;
