import { useState, useEffect } from "react";
import { LatLngTuple } from "leaflet";
import { MapContainer, TileLayer, useMap, ZoomControl } from "react-leaflet";
import MapMarker from "./MapMarker";
import { useShops } from "../../context/shopContext";
import { ShopMarker } from "../../types/dataTypes";
import SpeedDial from "../Dial/SpeedDial";
import { useMap as useMapContext } from "../../context/mapContext";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

const DEFAULT_POSITION: LatLngTuple = [40.7128, -74.006]; // NYC

const MapBox = () => {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  const [position, setPosition] = useState<LatLngTuple | null>(null);
  const [shopMarkers, setShopMarkers] = useState<ShopMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<LatLngTuple | null>(
    null,
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const { shops } = useShops();
  const { center, shopId } = useMapContext();
  const isMobileDevice = () => /Mobi|Android/i.test(navigator.userAgent);

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
        () => {
          setPosition(DEFAULT_POSITION);
        },
      );
    } else {
      setPosition(DEFAULT_POSITION);
    }
  }, []);

  useEffect(() => {
    if (shopId && shopMarkers.length > 0) {
      const marker = shopMarkers.find(
        (marker) => marker.popupContent.shopId === parseInt(shopId, 10),
      );
      if (marker) {
        setSelectedMarker(marker.position);
      }
    }
  }, [shopId, shopMarkers]);

  useEffect(() => {
    const fetchMarkers = async () => {
      const markers = shops.flatMap(
        (shop) =>
          shop.locations?.map((location) => {
            const fullAddress = [
              location.street_address || "Address not available",
              location.street_address_second || null,
              location.postal_code || "",
              location.city || "",
              location.state || "",
            ]
              .filter(Boolean)
              .join(", ");

            return {
              position: [location.latitude, location.longitude] as LatLngTuple,
              popupContent: {
                shopId: shop.id ?? 1,
                shopName: shop.name,
                address: fullAddress,
                description: shop.description || undefined,
                createdBy: shop.created_by_username || "admin",
                categories:
                  shop.categories
                    ?.map((category) => category.category_name)
                    .join(", ") || "No categories available",
                usersAvatarId: shop.users_avatar_id,
                latitude: location.latitude,
                longitude: location.longitude,
                locationOpen: location.location_open,
              },
              isPopupEnabled: true,
            };
          }) || [],
      );

      setShopMarkers(markers);
    };

    fetchMarkers();
  }, [shops]);

  useEffect(() => {
    if (center) {
      setSelectedMarker(center);
    }
  }, [center]);

  useEffect(() => {
    if (position && shopMarkers.length > 0) {
      setIsMapReady(true);
    }
  }, [position, shopMarkers]);

  if (!isMapReady) return <div>Loading map...</div>;

  return (
    <div>
      <MapContainer
        center={position || DEFAULT_POSITION}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        preferCanvas={isMobileDevice()}
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
          url="https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}"
          id="mapbox/streets-v11"
          maxZoom={22}
          tileSize={512}
          zoomOffset={-1}
          accessToken={mapboxAccessToken}
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> contributors'
        />
        <ZoomControl position="bottomleft" />
        <MapInteraction center={center} />
        <MarkerClusterGroup
          maxClusterRadius={50}
          chunkedLoading={true}
          chunkInterval={200}
          chunkDelay={50}
          spiderfyOnMaxZoom={true}
          removeOutsideVisibleBounds={true}
          animate={false}
          iconCreateFunction={createClusterCustomIcon}
          showCoverageOnHover={false}
        >
          {shopMarkers.map((marker, index) => (
            <MapMarker
              key={index}
              position={marker.position}
              popupContent={marker.popupContent}
              autoOpen={
                !!selectedMarker &&
                selectedMarker[0] === marker.position[0] &&
                selectedMarker[1] === marker.position[1]
              }
              isPopupEnabled={true}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      <SpeedDial />
    </div>
  );
};

export default MapBox;

const MapInteraction = ({ center }: { center: LatLngTuple | null }) => {
  const map = useMap();
  const { zoom } = useMapContext();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
};

/**
 * Creates a custom cluster.
 */
const createClusterCustomIcon = (cluster: L.MarkerCluster): L.DivIcon => {
  const childCount = cluster.getChildCount();

  const sizeClass =
    childCount < 10
      ? "w-10 h-10 text-sm"
      : childCount < 50
        ? "w-12 h-12 text-base text-accent"
        : "w-16 h-16 text-lg";

  const colorClass =
    childCount < 10
      ? "bg-[#FF5B00]"
      : childCount < 50
        ? "bg-secondary"
        : "bg-primary";

  const classes = `flex items-center justify-center text-white rounded-full font-bold ${sizeClass} ${colorClass}`;

  return L.divIcon({
    html: `<div class="${classes}">${childCount}</div>`,
    className: "",
    iconSize: L.point(40, 40, true),
  });
};
