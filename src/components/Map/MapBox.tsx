import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Map } from "mapbox-gl";
import type { Feature, FeatureCollection, Point } from "geojson";
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

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      default:
        return ch;
    }
  });

const MapBox = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const userPositionRef = useRef<Coordinates | null>(null);

  const { displayedShops } = useShops();
  const { openSidebar } = useShopSidebar();

  const openSidebarRef = useRef(openSidebar);
  useEffect(() => {
    openSidebarRef.current = openSidebar;
  }, [openSidebar]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prev = {
      htmlOverscroll: html.style.overscrollBehaviorY,
      htmlHeight: html.style.height,
      bodyOverscroll: body.style.overscrollBehaviorY,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyTop: body.style.top,
    };

    html.style.overscrollBehaviorY = "none";
    html.style.height = "100%";

    body.style.overscrollBehaviorY = "none";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = "0";

    const onTouchMove = (e: TouchEvent) => {
      const mapEl = mapContainerRef.current;
      if (!mapEl) return;

      const target = e.target as Node | null;
      if (target && mapEl.contains(target)) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("touchmove", onTouchMove);

      html.style.overscrollBehaviorY = prev.htmlOverscroll;
      html.style.height = prev.htmlHeight;

      body.style.overscrollBehaviorY = prev.bodyOverscroll;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.position = prev.bodyPosition;
      body.style.width = prev.bodyWidth;
      body.style.top = prev.bodyTop;
    };
  }, []);

  const geojson = useMemo<
    FeatureCollection<Point, ShopGeoJsonProperties>
  >(() => {
    const features: Feature<Point, ShopGeoJsonProperties>[] = [];

    for (const shop of displayedShops) {
      const locations = shop.locations ?? [];

      for (const location of locations) {
        const lng = Number(location.longitude);
        const lat = Number(location.latitude);

        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

        const address = [
          location.street_address ?? "Address not available",
          location.street_address_second ?? "",
          location.postal_code ?? "",
          location.city ?? "",
          location.state ?? "",
        ]
          .map((v) => String(v).trim())
          .filter((v) => v.length > 0)
          .join(", ");

        features.push({
          type: "Feature",
          properties: {
            shopId: shop.id ?? 1,
            shopName: shop.name,
            description: shop.description || "No description available",
            address,
            createdBy: shop.created_by_username || "admin",
            categories:
              shop.categories?.map((c) => c.category_name).join(", ") ||
              "No categories available",
            usersAvatarId: shop.users_avatar_id ?? undefined,
            usersAvatarEmail: undefined, // Not available in ShopWithUser model
            locationOpen:
              location.location_open === undefined ||
                location.location_open === null
                ? undefined
                : Number(location.location_open) === 1,
            website: location.website || "No website available",
            phone: location.phone || "No phone number available",
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

  const geojsonRef = useRef(geojson);
  useEffect(() => {
    geojsonRef.current = geojson;
  }, [geojson]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      console.error("Missing VITE_MAPBOX_ACCESS_TOKEN");
      return;
    }

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

    map.on("load", () => {
      if (map.getSource("shops")) return;

      map.addSource("shops", {
        type: "geojson",
        data: geojsonRef.current,
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
          "circle-color": "#DA291C", // brand-primary red
          "circle-radius": ["step", ["get", "point_count"], 18, 25, 22, 75, 28],
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFC72C", // brand-secondary yellow
          "circle-stroke-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "shops",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#FFFFFF", // white text for contrast
        },
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "shops",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#DA291C", // brand-primary red
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFC72C", // brand-secondary yellow
          "circle-opacity": 0.9,
          "circle-stroke-opacity": 0.95,
        },
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const feature = features[0];
        if (!feature) return;

        const clusterId = feature.properties?.cluster_id;
        if (clusterId === undefined || clusterId === null) return;

        const source = map.getSource("shops") as
          | mapboxgl.GeoJSONSource
          | undefined;
        if (!source) return;

        source.getClusterExpansionZoom(Number(clusterId), (err, zoom) => {
          if (err || zoom === undefined || zoom === null) return;

          const coords = (feature.geometry as GeoJSON.Point)
            .coordinates as Coordinates;

          map.easeTo({
            center: coords,
            zoom,
          });
        });
      });

      map.on("click", "unclustered-point", (e) => {
        const feature = e.features?.[0] as
          | Feature<Point, ShopGeoJsonProperties>
          | undefined;

        if (!feature) return;

        const coords = [...feature.geometry.coordinates] as Coordinates;
        const props = feature.properties;
        if (!props) return;

        const clickLng = e.lngLat.lng;
        while (Math.abs(clickLng - coords[0]) > 180) {
          coords[0] += clickLng > coords[0] ? 360 : -360;
        }

        openSidebarRef.current(props, userPositionRef.current);

        const safeName = escapeHtml(props.shopName);
        const safeAddr = escapeHtml(props.address);

        new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(coords)
          .setHTML(
            `<div style="max-width:260px;">
              <div style="font-weight:700;font-size:14px;line-height:1.2;">${safeName}</div>
              <div style="font-size:12px;opacity:0.9;margin-top:6px;">${safeAddr}</div>
            </div>`,
          )
          .addTo(map);
      });

      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mouseenter", "unclustered-point", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "unclustered-point", () => {
        map.getCanvas().style.cursor = "";
      });
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
          const center: Coordinates = [
            pos.coords.longitude,
            pos.coords.latitude,
          ];
          userPositionRef.current = center;

          map.flyTo({
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
      <div
        ref={mapContainerRef}
        style={{ position: "absolute", inset: 0, touchAction: "none" }}
      />

      <SpeedDial
        onLocateUser={() => {
          window.dispatchEvent(new Event("locateUser"));
        }}
      />
    </div>
  );
};

export default MapBox;
