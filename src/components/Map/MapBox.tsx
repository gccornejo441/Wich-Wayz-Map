import { useState, useEffect, useRef } from "react";
import mapboxgl, { Map, GeoJSONSource } from "mapbox-gl";
import { useShops } from "../../context/shopContext";
import SpeedDial from "../Dial/SpeedDial";
import { useMap as useMapContext } from "../../context/mapContext";

const DEFAULT_POSITION: Coordinates = [-74.006, 40.7128]; // NYC in [lng, lat] order

// Use [number, number] for coordinates (Mapbox expects [lng, lat])
type Coordinates = [number, number];
interface ShopGeoJsonProperties {
  shopId: number;
  shopName: string;
  address: string;
  description?: string;
  createdBy: string;
  categories?: string;
  usersAvatarId?: string;
  usersAvatarEmail?: string;
  locationOpen?: boolean;
}

export interface ShopMarker {
  position: Coordinates;
  popupContent: ShopGeoJsonProperties;
  isPopupEnabled: boolean;
  autoOpen?: boolean;
}

const MapBox = () => {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  // Use our own Coordinates type instead of LatLngTuple to enforce exactly two elements
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [shopMarkers, setShopMarkers] = useState<ShopMarker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const { shops } = useShops();
  // Removed 'shopId' because it was unused.
  const { center, zoom } = useMapContext();
  const mapZoom = zoom ?? 13;

  // Get user position (as [lng, lat])
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

  // Build markers from shops data
  useEffect(() => {
    const markers: ShopMarker[] = shops.flatMap(
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
            // Ensure coordinates are in [lng, lat] order
            position: [location.longitude, location.latitude] as Coordinates,
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
              locationOpen: location.location_open,
            },
            isPopupEnabled: false,
          };
        }) || []
    );
    setShopMarkers(markers);
  }, [shops]);

  // Update map center when provided by context
  useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.flyTo({ center: center as Coordinates, zoom: mapZoom });
    }
  }, [center, mapZoom]);

  // Initialize the Mapbox map once a position is set
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
        setIsMapReady(true);

        // Convert shopMarkers to GeoJSON FeatureCollection
        const geojson: GeoJSON.FeatureCollection<
          GeoJSON.Point,
          ShopGeoJsonProperties
        > = {
          type: "FeatureCollection",
          features: shopMarkers.map((marker) => ({
            type: "Feature",
            properties: { ...marker.popupContent },
            geometry: {
              type: "Point",
              coordinates: marker.position as [number, number],
            },
          })),
        };

        map.addSource("shops", {
          type: "geojson",
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "shops",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#FF5B00",
              10,
              "#f1f075",
              50,
              "#f28cb1",
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              15,
              10,
              20,
              50,
              25,
            ],
          },
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "shops",
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12,
          },
        });

        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "shops",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#11b4da",
            "circle-radius": 8,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff",
          },
        });

        // Handle click on unclustered markers
        map.on("click", "unclustered-point", (e: mapboxgl.MapMouseEvent) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["unclustered-point"],
          });

          if (!features.length) return;
          const feature = features[0] as GeoJSON.Feature<
            GeoJSON.Point,
            GeoJSON.GeoJsonProperties
          >;

          if (!feature.geometry || feature.geometry.type !== "Point") return;
          const coordinates: [number, number] = feature.geometry
            .coordinates as [number, number];

          const properties = feature.properties as ShopGeoJsonProperties;
          const popupHtml = `<strong>${properties.shopName}</strong><br/>${properties.address}<br/>${properties.description || ""}<br/><em>${properties.categories}</em>`;

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(popupHtml)
            .addTo(map);
        });

        // Cursor change on clusters
        map.on("mouseenter", "clusters", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "clusters", () => {
          map.getCanvas().style.cursor = "";
        });

        // Cluster zoom behavior
        map.on("click", "clusters", (e: mapboxgl.MapMouseEvent) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["clusters"],
          });
          if (!features.length) return;
          const clusterId = features[0].properties?.cluster_id;
          if (clusterId === undefined) return;
          (map.getSource("shops") as GeoJSONSource).getClusterExpansionZoom(
            clusterId,
            (err, zoomLevel) => {
              if (err) return;
              map.easeTo({
                center: (
                  features[0].geometry as GeoJSON.Point
                ).coordinates.slice(0, 2) as [number, number],
                zoom: zoomLevel as number,
              });
            }
          );
        });
      });

      mapRef.current = map;
    }
  }, [position, shopMarkers, mapboxAccessToken, mapZoom]);

  // Update GeoJSON source data when shopMarkers change
  useEffect(() => {
    if (isMapReady && mapRef.current) {
      const source = mapRef.current.getSource("shops") as GeoJSONSource;

      if (source) {
        // Transform shopMarkers to GeoJSON format
        const geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
          type: "FeatureCollection",
          features: shopMarkers.map((marker) => ({
            type: "Feature",
            properties: {
              shopId: marker.popupContent.shopId,
              shopName: marker.popupContent.shopName,
              address: marker.popupContent.address,
              description: marker.popupContent.description,
              createdBy: marker.popupContent.createdBy,
              categories: marker.popupContent.categories,
              usersAvatarId: marker.popupContent.usersAvatarId,
              locationOpen: marker.popupContent.locationOpen,
            },
            geometry: {
              type: "Point",
              coordinates: marker.position as [number, number], // Ensure it is in [lng, lat] format
            },
          })),
        };

        source.setData(geojson);
      }
    }
  }, [shopMarkers, isMapReady]);

  // Listen for the SpeedDial "locateUser" event to trigger geolocation
  useEffect(() => {
    const handleLocateUser = () => {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: position || DEFAULT_POSITION,
          zoom: mapZoom,
        });
      }
    };
    window.addEventListener("locateUser", handleLocateUser);
    return () => {
      window.removeEventListener("locateUser", handleLocateUser);
    };
  }, [position, mapZoom]);

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

      {isMapReady &&
        mapRef.current &&
        shopMarkers.map((marker, index) => (
          <CustomMarker
            key={index}
            mapContainer={mapContainerRef}
            map={mapRef.current!}
            position={marker.position}
            popupContent={{
              ...marker.popupContent,
            }}
            isPopupEnabled={marker.isPopupEnabled}
            autoOpen={marker.autoOpen}
          />
        ))}
    </div>
  );
};

interface MapMarkerProps extends ShopMarker {
  map: mapboxgl.Map;
  mapContainer: React.RefObject<HTMLDivElement>;
}

const CustomMarker = ({
  map,
  position,
  popupContent,
  isPopupEnabled = true,
  autoOpen = false,
}: MapMarkerProps) => {
  useEffect(() => {
    if (!map) return;

    // Create a custom HTML element for the marker
    const el = document.createElement("div");
    el.className = "custom-marker"; // Optional: Add class for further styling
    el.style.width = "50px"; // Adjust size as needed
    el.style.height = "50px";
    el.style.backgroundImage = "url('/sandwich-pin.svg')";
    el.style.backgroundSize = "contain"; // Ensures the whole image is visible
    el.style.backgroundRepeat = "no-repeat";
    el.style.cursor = "pointer";

    const marker = new mapboxgl.Marker(el)
      .setLngLat(position)
      .addTo(map);

    if (isPopupEnabled) {
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(
          `<strong>${popupContent.shopName}</strong><br/>${popupContent.address}`
        );

      if (autoOpen) {
        popup.addTo(map);
      }

      marker.setPopup(popup);
    }

  }, [map, position, popupContent, isPopupEnabled, autoOpen]);

  return null; // This component doesn't render anything directly
};

export default MapBox;
