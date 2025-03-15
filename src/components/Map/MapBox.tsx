import { useEffect, useRef, useCallback } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import { useShops } from "../../context/shopContext";
import SpeedDial from "../Dial/SpeedDial";
import { useMap as useMapContext } from "../../context/mapContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { Location as wayz_Location } from "@/models/Location";

const DEFAULT_POSITION: [number, number] = [-74.006, 40.7128]; // NYC

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

const formatAddress = (location: wayz_Location): string => {
  return [
    location.street_address,
    location.street_address_second,
    location.city,
    location.state,
    location.postal_code,
    location.country,
  ]
    .filter(Boolean)
    .join(", ");
};

const MapBox = () => {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const { shops } = useShops();
  const { center, zoom, userInteracted, setUserInteracted } = useMapContext();
  const { openSidebar } = useShopSidebar();

  // Function to handle marker clicks
  const handleMarkerClick = useCallback(
    (shop: ShopGeoJsonProperties, coordinates: [number, number]) => {
      setUserInteracted(true);
      openSidebar(shop, coordinates);
    },
    [openSidebar, setUserInteracted],
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = mapboxAccessToken;

    const containerElement = mapContainerRef.current;
    if (!containerElement) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        const map = new mapboxgl.Map({
          container: containerElement,
          style: "mapbox://styles/mapbox/streets-v12",
          center: center
            ? ([center[0], center[1]] as [number, number])
            : userLocation,
          zoom,
        });

        map.addControl(new mapboxgl.NavigationControl(), "bottom-left");
        mapRef.current = map;
      },
      () => {
        const map = new mapboxgl.Map({
          container: containerElement,
          style: "mapbox://styles/mapbox/streets-v12",
          center: DEFAULT_POSITION,
          zoom,
        });

        map.addControl(new mapboxgl.NavigationControl(), "bottom-left");
        mapRef.current = map;
      },
    );
  }, [mapboxAccessToken, center, zoom]);

  const renderCustomMarkers = useCallback(
    (map: Map) => {
      document.querySelectorAll(".custom-marker").forEach((el) => el.remove());

      shops.forEach((shop) => {
        shop.locations?.forEach((location) => {
          const markerElement = document.createElement("div");
          markerElement.className = "custom-marker";
          markerElement.style.width = "30px";
          markerElement.style.height = "40px";
          markerElement.style.backgroundImage = "url('/sandwich-pin-v2.svg')";
          markerElement.style.backgroundSize = "cover";
          markerElement.style.cursor = "pointer";

          markerElement.addEventListener("click", () => {
            const shopData: ShopGeoJsonProperties = {
              shopId: shop.id ?? 1,
              shopName: shop.name,
              address: formatAddress(location),
              createdBy: shop.created_by_username || "admin",
              categories:
                shop.categories
                  ?.map((category) => category.category_name)
                  .join(", ") || "No categories available",
              usersAvatarId: shop.users_avatar_id,
              locationOpen: location.location_open,
            };

            handleMarkerClick(shopData, [
              location.longitude,
              location.latitude,
            ]);
          });

          new mapboxgl.Marker(markerElement)
            .setLngLat([location.longitude, location.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 15 }).setHTML(`
                 <div style="
    font-family: Arial, sans-serif;
    padding: 12px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    max-width: 250px;
    text-align: left;
  ">
    <h2 style="
      margin: 0 0 10px;
      color: #DA291C;
      font-size: 18px;
      font-weight: bold;
    ">
      ${shop.name}
    </h2>
    <p style="
      margin: 0;
      color: #555;
      font-size: 14px;
      line-height: 1.5;
    ">
       <strong>Address:</strong> ${formatAddress(location)}
    </p>
  </div>
              `),
            )
            .addTo(map);
        });
      });
    },
    [shops, handleMarkerClick],
  );

  useEffect(() => {
    if (mapRef.current) {
      renderCustomMarkers(mapRef.current);
    }
  }, [shops, renderCustomMarkers]);

  useEffect(() => {
    if (!userInteracted && center && mapRef.current) {
      mapRef.current.flyTo({
        center: [center[0], center[1]],
        zoom,
        speed: 1.2,
      });
    }
  }, [center, zoom, userInteracted]);

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
