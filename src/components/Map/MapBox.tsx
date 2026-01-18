import { useEffect, useMemo, useRef } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import SpeedDial from "../Dial/SpeedDial";
import { useShops } from "../../context/shopContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";

const DEFAULT_CENTER: [number, number] = [-74.5, 40];
const DEFAULT_ZOOM = 9;

type Coordinates = [number, number];

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
  const userPositionRef = useRef<Coordinates | null>(null);
  const openSidebarRef = useRef<
    (p: ShopGeoJsonProperties, pos: Coordinates | null) => void
  >(() => {});

  const { displayedShops } = useShops();
  const { openSidebar } = useShopSidebar();

  useEffect(() => {
    openSidebarRef.current = openSidebar;
  }, [openSidebar]);

  const geojson = useMemo<
    GeoJSON.FeatureCollection<GeoJSON.Point, ShopGeoJsonProperties>
  >(() => {
    const features: GeoJSON.Feature<
      GeoJSON.Point,
      ShopGeoJsonProperties
    >[] = [];

    for (const shop of displayedShops) {
      const locations = shop.locations ?? [];

      for (const location of locations) {
        const lng = Number(location.longitude);
        const lat = Number(location.latitude);

        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

        const address = [
          location.street_address || "Address not available",
          location.street_address_second || undefined,
          location.postal_code || "",
          location.city || "",
          location.state || "",
        ]
          .filter(Boolean)
          .join(", ");

        features.push({
          type: "Feature",
          properties: {
            shopId: shop.id ?? 1,
            shopName: shop.name,
            address,
            description: shop.description || undefined,
            createdBy: shop.created_by_username || "admin",
            categories:
              shop.categories?.map((c) => c.category_name).join(", ") ||
              "No categories available",
            usersAvatarId: shop.users_avatar_id,
            locationOpen:
              location.location_open === undefined
                ? undefined
                : Number(location.location_open) === 1,
            website: location.website || undefined,
            phone: location.phone || undefined,
            latitude: lat,
            longitude: lng,
          },
          geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
        });
      }
    }

    return { type: "FeatureCollection", features };
  }, [displayedShops]);

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

    const ensureSandwichPinImage = async () => {
      if (map.hasImage("sandwich-pin")) return true;

      return await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            if (!map.hasImage("sandwich-pin")) {
              map.addImage("sandwich-pin", img, { pixelRatio: 2 });
            }
            resolve(true);
          } catch (err) {
            console.error("addImage failed:", err);
            resolve(false);
          }
        };

        img.onerror = (err) => {
          console.error("Failed to load pin image:", err);
          resolve(false);
        };

        img.src = "/sandwich-pin-v2.svg";
      });
    };

    const addUnclusteredSymbolLayer = () => {
      if (map.getLayer("unclustered-point")) return;

      map.addLayer({
        id: "unclustered-point",
        type: "symbol",
        source: "shops",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": "sandwich-pin",
          "icon-size": 1.0,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-anchor": "bottom",
        },
      });
    };

    const addUnclusteredCircleFallback = () => {
      if (map.getLayer("unclustered-point")) return;

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "shops",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 7,
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0.95,
        },
      });
    };

    const wireHandlers = () => {
      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });

        const feature = features[0];
        if (!feature) return;

        const clusterIdRaw = feature.properties?.cluster_id;
        if (clusterIdRaw === undefined || clusterIdRaw === null) return;

        const clusterId = Number(clusterIdRaw);
        if (!Number.isFinite(clusterId)) return;

        const source = map.getSource("shops") as mapboxgl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err2, zoom) => {
          if (err2) return;
          if (typeof zoom !== "number") return;

          const coords = (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];

          map.easeTo({ center: coords, zoom });
        });
      });

      map.on("click", "unclustered-point", (e) => {
        const f = e.features?.[0] as mapboxgl.MapboxGeoJSONFeature | undefined;
        if (!f) return;

        const coords = (f.geometry as GeoJSON.Point).coordinates as [
          number,
          number,
        ];
        const props = f.properties as unknown as ShopGeoJsonProperties;

        if (!coords || coords.length !== 2) return;
        if (!props) return;

        const clickLng = e.lngLat.lng;
        const adjusted: [number, number] = [coords[0], coords[1]];
        while (Math.abs(clickLng - adjusted[0]) > 180) {
          adjusted[0] += clickLng > adjusted[0] ? 360 : -360;
        }

        openSidebarRef.current(props, userPositionRef.current);

        new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(adjusted)
          .setHTML(
            `<div style="max-width:260px;">
              <div style="font-weight:700;font-size:14px;line-height:1.2;">${props.shopName ?? ""}</div>
              <div style="font-size:12px;opacity:0.9;margin-top:6px;">${props.address ?? ""}</div>
            </div>`,
          )
          .addTo(map);
      });

      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", "unclustered-point", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "unclustered-point", () => (map.getCanvas().style.cursor = ""));
    };

    map.on("load", () => {
      if (!map.getSource("shops")) {
        map.addSource("shops", {
          type: "geojson",
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });
      }

      if (!map.getLayer("clusters")) {
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "shops",
          filter: ["has", "point_count"],
          paint: {
            "circle-radius": ["step", ["get", "point_count"], 18, 25, 22, 75, 28],
            "circle-opacity": 0.85,
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.9,
          },
        });
      }

      if (!map.getLayer("cluster-count")) {
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "shops",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
          },
        });
      }

      void (async () => {
        const ok = await ensureSandwichPinImage();
        if (ok) addUnclusteredSymbolLayer();
        else addUnclusteredCircleFallback();

        wireHandlers();
      })();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("shops") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData(geojson);
  }, [geojson]);

  useEffect(() => {
    const handleLocateUser = () => {
      const map = mapRef.current;
      if (!map) return;

      if (!navigator.geolocation) {
        console.error("Geolocation is not supported in this browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const center: Coordinates = [pos.coords.longitude, pos.coords.latitude];
          userPositionRef.current = center;

          map.flyTo({ center, zoom: 14, essential: true });
        },
        (err) => {
          console.error("Geolocation error:", err);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
      );
    };

    window.addEventListener("locateUser", handleLocateUser);
    return () => window.removeEventListener("locateUser", handleLocateUser);
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