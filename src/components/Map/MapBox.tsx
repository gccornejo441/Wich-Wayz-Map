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
  const { shops } = useShops();
  const { zoom } = useMapContext();
  const { openSidebar } = useShopSidebar();
  const mapZoom = zoom ?? 13;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPosition: Coordinates = [
            pos.coords.longitude,
            pos.coords.latitude,
          ];
          setPosition(userPosition);
        },
        () => setPosition(DEFAULT_POSITION)
      );
    } else {
      setPosition(DEFAULT_POSITION);
    }
  }, []);

  useEffect(() => {
    if (position && mapContainerRef.current && !mapRef.current) {
      mapboxgl.accessToken = mapboxAccessToken;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: position,
        zoom: mapZoom,
      });

      map.addControl(new mapboxgl.NavigationControl(), "bottom-left");

      map.on("load", () => {
        const geojson: GeoJSON.FeatureCollection<
          GeoJSON.Point,
          ShopGeoJsonProperties
        > = {
          type: "FeatureCollection",
          features: shops.flatMap(
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
                  type: "Feature",
                  properties: {
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
                    locationOpen: location.location_open,
                  },
                  geometry: {
                    type: "Point",
                    coordinates: [
                      location.longitude,
                      location.latitude,
                    ] as Coordinates,
                  },
                };
              }) || []
          ),
        };

        map.addSource("shops", {
          type: "geojson",
          data: geojson,
        });

        map.addLayer({
          id: "shop-markers",
          type: "circle",
          source: "shops",
          paint: {
            "circle-radius": 8,
            "circle-color": "#FF5B00",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });

        map.on("click", "shop-markers", (e: mapboxgl.MapMouseEvent) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["shop-markers"],
          });

          if (!features.length) return;

          const feature = features[0] as unknown as GeoJSON.Feature<
            GeoJSON.Point,
            GeoJSON.GeoJsonProperties
          >;

          if (!feature.geometry || feature.geometry.type !== "Point") return;
          const coordinates: [number, number] = feature.geometry
            .coordinates as [number, number];

          if (!feature.properties) return;

          const properties = feature.properties as ShopGeoJsonProperties;

          if (properties.shopId && properties.shopName && properties.address) {
            openSidebar(properties);
          }

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(
              `<strong>${properties.shopName}</strong><br/>${properties.address}`
            )
            .addTo(map);
        });
      });

      mapRef.current = map;
    }
  }, [position, shops, mapboxAccessToken, mapZoom, openSidebar]);

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
