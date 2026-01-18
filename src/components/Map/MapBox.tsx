import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { GeoJSONSource, Map } from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";

import { useShops } from "@/context/shopContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import type { Location } from "@models/Location";
import type { ShopWithUser } from "@models/ShopWithUser";

const INITIAL_CENTER: [number, number] = [-74.0242, 40.6941];
const INITIAL_ZOOM = 10.12;

export type ShopGeoJsonProperties = {
  shopId: number;
  shopName: string;
  categories: string;

  imageUrl?: string;
  description?: string;

  usersAvatarEmail?: string;
  usersAvatarId?: string;
  createdBy?: string;

  votes?: number;
  categoryIds?: number[];

  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  phone?: string;
  website?: string;
  website_url?: string;

  latitude?: number;
  longitude?: number;

  [key: string]: unknown;
};

type ShopFeature = GeoJSON.Feature<GeoJSON.Point, ShopGeoJsonProperties>;
type ShopFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  ShopGeoJsonProperties
>;

const SOURCE_ID = "shops";
const CLUSTERS_LAYER_ID = "shops-clusters";
const CLUSTER_COUNT_LAYER_ID = "shops-cluster-count";
const UNCLUSTERED_LAYER_ID = "shops-unclustered";

const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const getString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

const toNumber = (v: unknown): number | undefined => {
  if (isNumber(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const getLngLat = (loc: Location): { lng: number; lat: number } | null => {
  const maybeLng =
    (loc as unknown as { longitude?: unknown; lng?: unknown }).longitude ??
    (loc as unknown as { lng?: unknown }).lng;

  const maybeLat =
    (loc as unknown as { latitude?: unknown; lat?: unknown }).latitude ??
    (loc as unknown as { lat?: unknown }).lat;

  if (!isNumber(maybeLng) || !isNumber(maybeLat)) return null;
  return { lng: maybeLng, lat: maybeLat };
};

const getShopName = (shop: ShopWithUser): string => {
  const s = shop as unknown as { shop_name?: unknown; name?: unknown };
  if (typeof s.shop_name === "string" && s.shop_name.length) return s.shop_name;
  if (typeof s.name === "string" && s.name.length) return s.name;
  return "";
};

const getCategoriesString = (shop: ShopWithUser): string => {
  const s = shop as unknown as { categories?: unknown };
  if (typeof s.categories === "string") return s.categories;
  if (Array.isArray(s.categories)) {
    return s.categories
      .filter((x): x is string => typeof x === "string")
      .join(",");
  }
  return "";
};

const stopMapClick = (e: mapboxgl.MapMouseEvent) => {
  e.preventDefault();
  const oe = e.originalEvent as Event | undefined;
  if (oe) {
    oe.preventDefault();
    oe.stopPropagation();
  }
};

const MapBox = () => {
  const { displayedShops } = useShops();
  const { openSidebar } = useShopSidebar();

  const openSidebarRef = useRef(openSidebar);
  useEffect(() => {
    openSidebarRef.current = openSidebar;
  }, [openSidebar]);

  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [center, setCenter] = useState<[number, number]>(INITIAL_CENTER);
  const [zoom, setZoom] = useState<number>(INITIAL_ZOOM);

  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null,
  );
  const userPositionRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    userPositionRef.current = userPosition;
  }, [userPosition]);

  useEffect(() => {
    const fallback: [number, number] = INITIAL_CENTER;

    if (!navigator.geolocation) {
      setUserPosition(fallback);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.longitude, pos.coords.latitude]),
      () => setUserPosition(fallback),
    );
  }, []);

  const shopGeoJson: ShopFeatureCollection = useMemo(() => {
    const features: ShopFeature[] = [];

    for (const shop of displayedShops) {
      if (typeof shop.id !== "number") continue;

      const locs = shop.locations ?? [];
      for (const loc of locs) {
        const ll = getLngLat(loc);
        if (!ll) continue;

        const shopAny = shop as unknown as {
          image_url?: unknown;
          imageUrl?: unknown;
          shop_description?: unknown;
          description?: unknown;

          usersAvatarEmail?: unknown;
          user_email?: unknown;
          usersAvatarId?: unknown;
          user_avatar_id?: unknown;

          createdBy?: unknown;
          created_by?: unknown;

          votes?: unknown;

          categoryIds?: unknown;
          category_ids?: unknown;

          phone?: unknown;

          website?: unknown;
          website_url?: unknown;
          websiteUrl?: unknown;
        };

        const locAny = loc as unknown as {
          address?: unknown;
          street_address?: unknown;
          street_address_second?: unknown;
          city?: unknown;
          state?: unknown;
          postalCode?: unknown;
          postal_code?: unknown;
          country?: unknown;
          website?: unknown;
          phone?: unknown;
        };

        const address =
          getString(locAny.address) ??
          [
            getString(locAny.street_address),
            getString(locAny.street_address_second),
            getString(locAny.postal_code) ?? getString(locAny.postalCode),
            getString(locAny.city),
            getString(locAny.state),
          ]
            .filter((x): x is string => typeof x === "string" && x.length > 0)
            .join(", ");

        const phone = getString(shopAny.phone) ?? getString(locAny.phone);

        const website =
          getString(shopAny.website) ??
          getString(shopAny.websiteUrl) ??
          getString(shopAny.website_url) ??
          getString(locAny.website);

        const website_url =
          getString(shopAny.website_url) ??
          getString(shopAny.websiteUrl) ??
          getString(shopAny.website) ??
          getString(locAny.website);

        const props: ShopGeoJsonProperties = {
          shopId: shop.id,
          shopName: getShopName(shop),
          categories: getCategoriesString(shop),

          imageUrl: getString(shopAny.imageUrl) ?? getString(shopAny.image_url),
          description:
            getString(shopAny.description) ??
            getString(shopAny.shop_description),

          usersAvatarEmail:
            getString(shopAny.usersAvatarEmail) ?? getString(shopAny.user_email),
          usersAvatarId:
            getString(shopAny.usersAvatarId) ??
            getString(shopAny.user_avatar_id),

          createdBy: getString(shopAny.createdBy) ?? getString(shopAny.created_by),

          votes: isNumber(shopAny.votes) ? shopAny.votes : undefined,

          categoryIds:
            Array.isArray(shopAny.categoryIds) &&
              shopAny.categoryIds.every((x) => typeof x === "number")
              ? shopAny.categoryIds
              : Array.isArray(shopAny.category_ids) &&
                shopAny.category_ids.every((x) => typeof x === "number")
                ? shopAny.category_ids
                : undefined,

          address: address || undefined,
          city: getString(locAny.city),
          state: getString(locAny.state),
          postalCode:
            getString(locAny.postalCode) ?? getString(locAny.postal_code),
          country: getString(locAny.country),

          phone,
          website,
          website_url,

          latitude: ll.lat,
          longitude: ll.lng,
        };

        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [ll.lng, ll.lat] },
          properties: props,
        });
      }
    }

    return { type: "FeatureCollection", features };
  }, [displayedShops]);

  const shopGeoJsonRef = useRef<ShopFeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });

  useEffect(() => {
    shopGeoJsonRef.current = shopGeoJson;
  }, [shopGeoJson]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

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

    const onLoad = () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: shopGeoJsonRef.current,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: CLUSTERS_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["step", ["get", "point_count"], 16, 25, 22, 50, 28],
          "circle-opacity": 0.85,
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
        },
      });

      map.addLayer({
        id: UNCLUSTERED_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-opacity": 0.9,
        },
      });

      map.on("click", CLUSTERS_LAYER_ID, (e) => {
        stopMapClick(e);

        const feature = e.features?.[0];
        if (!feature) return;

        const props = feature.properties as unknown as { cluster_id?: unknown };
        const clusterId = props.cluster_id;
        if (!isNumber(clusterId)) return;

        const src = map.getSource(SOURCE_ID) as GeoJSONSource & {
          getClusterExpansionZoom: (
            id: number,
            cb: (err: unknown, zoom: number) => void,
          ) => void;
        };

        src.getClusterExpansionZoom(clusterId, (err, nextZoom) => {
          if (err) return;

          const coords = (feature.geometry as GeoJSON.Point)
            .coordinates as [number, number];

          const safeZoom =
            typeof nextZoom === "number" && Number.isFinite(nextZoom)
              ? nextZoom
              : map.getZoom();

          map.easeTo({ center: coords, zoom: safeZoom });
        });
      });

      map.on("click", UNCLUSTERED_LAYER_ID, (e) => {
        stopMapClick(e);

        const feature = e.features?.[0];
        if (!feature) return;

        const raw = (feature.properties ?? {}) as unknown as Record<string, unknown>;

        const shopId = toNumber(raw.shopId);
        if (!shopId) return;

        const props: ShopGeoJsonProperties = {
          ...(raw as unknown as ShopGeoJsonProperties),
          shopId,
          shopName: getString(raw.shopName) ?? "",
          categories: getString(raw.categories) ?? "",
          address: getString(raw.address),
          phone: getString(raw.phone),
          website: getString(raw.website),
          website_url: getString(raw.website_url),
          city: getString(raw.city),
          state: getString(raw.state),
          postalCode: getString(raw.postalCode),
          country: getString(raw.country),
          imageUrl: getString(raw.imageUrl),
          description: getString(raw.description),
          usersAvatarEmail: getString(raw.usersAvatarEmail),
          usersAvatarId: getString(raw.usersAvatarId),
          createdBy: getString(raw.createdBy),
        };

        openSidebarRef.current(props, userPositionRef.current);
      });

      map.on("mouseenter", CLUSTERS_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTERS_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mouseenter", UNCLUSTERED_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", UNCLUSTERED_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
    };

    map.on("move", onMove);
    map.on("load", onLoad);

    return () => {
      map.off("load", onLoad);
      map.off("move", onMove);

      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!src) return;

    src.setData(shopGeoJson);
  }, [shopGeoJson]);

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
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} |
        Zoom: {zoom.toFixed(2)} | Shops: {shopGeoJson.features.length}
      </div>

      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default MapBox;
