import { useState, useEffect } from "react";
import { LatLngTuple } from "leaflet";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import MapMarker from "./MapMarker";
import { useShops } from "../../context/shopContext";
import { ShopMarker } from "../../types/dataTypes";
import SpeedDial from "../Dial/SpeedDial";

const DEFAULT_POSITION: LatLngTuple = [40.7128, -74.006]; // NYC

const MapBox = () => {
  const [position, setPosition] = useState<LatLngTuple | null>(null);
  const [shopMarkers, setShopMarkers] = useState<ShopMarker[]>([]);
  const { shops } = useShops();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPosition: LatLngTuple = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          setPosition(userPosition);
        },
        (err) => {
          console.warn("Geolocation permission denied or another error:", err);
          setPosition(DEFAULT_POSITION);
        },
      );
    } else {
      setPosition(DEFAULT_POSITION);
    }
  }, []);

  useEffect(() => {
    const fetchMarkers = async () => {
      const markers = shops.flatMap(
        (shop) =>
          shop.locations?.map((location) => ({
            position: [location.latitude, location.longitude] as LatLngTuple,
            popupContent: {
              shopId: shop.id ?? 1,
              shopName: shop.name,
              address: `${location.street_address || "Address not available"}, ${
                location.postal_code || ""
              }, ${location.city || ""}, ${location.state || ""}`,
              description: shop.description || undefined,
              createdBy: shop.created_by_username || "admin",
              categories:
                shop.categories?.map((category) => category.name).join(", ") ||
                "No categories available",
            },
            isPopupEnabled: true,
          })) || [],
      );

      setShopMarkers(markers);
    };

    fetchMarkers();
  }, [shops]);

  if (!position) return <div>Loading map...</div>;

  return (
    <div>
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        style={{
          height: "100vh",
          width: "100vw",
          zIndex: -1,
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomControl position="bottomleft" />

        {shopMarkers.map((marker, index) => (
          <MapMarker
            key={index}
            position={marker.position}
            popupContent={marker.popupContent}
            isPopupEnabled={marker.isPopupEnabled}
          />
        ))}
      </MapContainer>
      <SpeedDial />
    </div>
  );
};

export default MapBox;
