import { useState, useEffect, useRef } from "react";
import mapboxgl, { Map, GeoJSONSource } from "mapbox-gl";
import { useShops } from "../../context/shopContext";
import SpeedDial from "../Dial/SpeedDial";
import { useMap as useMapContext } from "../../context/mapContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";

const DEFAULT_POSITION: Coordinates = [-74.006, 40.7128]; // NYC in [lng, lat] order

// Use [number, number] for coordinates (Mapbox expects [lng, lat])
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

export interface ShopMarker {
  position: Coordinates;
  popupContent: ShopGeoJsonProperties;
  isPopupEnabled?: boolean;
  autoOpen?: boolean;
}

const MapBox = () => {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  const [position, setPosition] = useState<Coordinates | null>(null);
  const [shopMarkers, setShopMarkers] = useState<ShopMarker[]>([]);
  // New state to store markers that are unclustered
  const [unclusteredMarkers, setUnclusteredMarkers] = useState<ShopMarker[]>(
    []
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const { shops } = useShops();
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
              coordinates: marker.position,
            },
          })),
        };

        map.addSource("shops", {
          type: "geojson",
          data: geojson,
          cluster: true, // Enable clustering
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Cluster Layer
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

        // Add an invisible unclustered-point layer for querying purposes
        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "shops",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-opacity": 0,
          },
        });

        // Cluster Zoom Behavior (when clicking a cluster)
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

        map.on("click", "unclustered-point", (e: mapboxgl.MapMouseEvent) => {
          console.log(`Shop ID: ${e.point}`);

          // features represent the clicked point which contains the shopId, shopName, address, etc.
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["unclustered-point"],
          });

          // If features is empty, return.
          // Which means that the user clicked on the map but not on a shop marker.
          if (!features.length) return;

          // feature represents the first feature in the features array
          // which contains the shopId, shopName, address, etc.
          // Expected output:
          // { type: 'Feature',
          // properties: { shopId: 1, shopName: 'Shop Name', address: 'Shop Address' }, geometry: { type: 'Point', coordinates: [ -74.006, 40.7128 ] } }
          const feature = features[0] as GeoJSON.Feature<
            GeoJSON.Point,
            GeoJSON.GeoJsonProperties
          >;
          if (!feature.geometry || feature.geometry.type !== "Point") return;
          const coordinates: [number, number] = feature.geometry
            .coordinates as [number, number];

          const properties = feature.properties as ShopGeoJsonProperties;
          console.log(`Shop ID: ${properties}`);

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
  }, [position, shopMarkers, mapboxAccessToken, mapZoom]);

  // Update GeoJSON source data when shopMarkers change
  useEffect(() => {
    if (isMapReady && mapRef.current) {
      const source = mapRef.current.getSource("shops") as GeoJSONSource;
      if (source) {
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
              coordinates: marker.position,
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

// New useEffect: Query unclustered features after each map movement
useEffect(() => {
  if (!isMapReady || !mapRef.current) return;

  const updateUnclusteredMarkers = () => {
    const features = mapRef.current!.queryRenderedFeatures({
      layers: ["unclustered-point"],
    });

    // Filter for Point geometries and then map to ShopMarker
    const markers: ShopMarker[] = features.reduce<ShopMarker[]>((acc, feature) => {
      if (feature.geometry && feature.geometry.type === "Point") {
        const props = feature.properties as ShopGeoJsonProperties;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        acc.push({
          position: coords,
          popupContent: props,
          isPopupEnabled: false,
        });
      }
      return acc;
    }, []);

    setUnclusteredMarkers(markers);
  };

  // Update on moveend (or data update)
  mapRef.current.on("moveend", updateUnclusteredMarkers);
  // Initial update
  updateUnclusteredMarkers();

  return () => {
    if (mapRef.current) {
      mapRef.current.off("moveend", updateUnclusteredMarkers);
    }
  };
}, [isMapReady]);

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
        // Render custom markers only for unclustered features
        unclusteredMarkers.map((marker, index) => (
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

interface MapMarkerProps {
  map: mapboxgl.Map;
  position: Coordinates;
  popupContent: ShopGeoJsonProperties;
  isPopupEnabled?: boolean;
  autoOpen?: boolean;
}

const CustomMarker = ({
  map,
  position,
  popupContent,
  isPopupEnabled = true,
  autoOpen = false,
}: MapMarkerProps) => {
  const { openSidebar } = useShopSidebar();

  useEffect(() => {
    if (!map) return;

    const el = document.createElement("div");
    el.className = "custom-marker";
    el.style.width = "50px";
    el.style.height = "50px";
    el.style.backgroundImage = "url('/sandwich-pin.svg')";
    el.style.backgroundSize = "contain";
    el.style.backgroundRepeat = "no-repeat";
    el.style.cursor = "pointer";

    const marker = new mapboxgl.Marker(el).setLngLat(position).addTo(map);

    el.addEventListener("click", () => {
      console.log("Marker clicked:", popupContent);
      openSidebar(popupContent);
    });

    if (isPopupEnabled) {
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<strong>${popupContent.shopName}</strong><br/>${popupContent.address}`
      );

      if (autoOpen) {
        popup.addTo(map);
      }
      marker.setPopup(popup);
    }

    return () => {
      marker.remove();
    };
  }, [map, position, popupContent, isPopupEnabled, autoOpen, openSidebar]);

  return null;
};


export default MapBox;
