import { useEffect, useMemo, useRef, useState } from "react";
import { HiClipboard } from "react-icons/hi";
import Map, {
  FullscreenControl,
  MapLayerMouseEvent,
  MapRef,
  Marker,
  MarkerDragEvent,
  NavigationControl,
} from "react-map-gl";

import "mapbox-gl/dist/mapbox-gl.css";

import { getStateCode } from "@constants/usStates";
import { useTheme } from "@hooks/useTheme";
import { AddressDraft } from "@/types/address";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

interface MapPreviewProps {
  address: AddressDraft;
  fullAddressForMaps: string;
  onAddressUpdate: (
    next: AddressDraft | ((prev: AddressDraft) => AddressDraft),
  ) => void;
  prefillFlyToNonce: number;
  containerClassName?: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface MapboxContextEntry {
  id?: string;
  text?: string;
  short_code?: string;
}

interface MapboxFeature {
  address?: string;
  text?: string;
  context?: MapboxContextEntry[];
}

interface MapboxGeocodeResponse {
  features?: MapboxFeature[];
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const MAPBOX_STYLE_LIGHT = "mapbox://styles/mapbox/streets-v12";
const MAPBOX_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";

const parseReverseGeocode = (json: MapboxGeocodeResponse) => {
  const feature = json.features?.[0];
  if (!feature) return null;

  const context = feature.context ?? [];
  let streetAddress = "";
  let city = "";
  let state = "";
  let postalCode = "";
  let country = "";

  if (feature.address && feature.text) {
    streetAddress = `${feature.address} ${feature.text}`;
  } else if (feature.text) {
    streetAddress = feature.text;
  }

  for (const entry of context) {
    const id = entry.id ?? "";
    if (id.startsWith("postcode")) {
      postalCode = entry.text ?? "";
      continue;
    }
    if (id.startsWith("place")) {
      city = entry.text ?? "";
      continue;
    }
    if (id.startsWith("region")) {
      const rawState = entry.short_code?.replace("US-", "") || entry.text || "";
      state = getStateCode(rawState);
      continue;
    }
    if (id.startsWith("country")) {
      country = entry.short_code?.toUpperCase() || entry.text || "";
    }
  }

  return { streetAddress, city, state, postalCode, country };
};

const MapPreview: React.FC<MapPreviewProps> = ({
  address,
  fullAddressForMaps,
  onAddressUpdate,
  prefillFlyToNonce,
  containerClassName,
}) => {
  const { theme } = useTheme();
  const [coords, setCoords] = useState<Coordinates | null>(() => {
    if (
      !isFiniteNumber(address.latitude) ||
      !isFiniteNumber(address.longitude)
    ) {
      return null;
    }
    return {
      latitude: address.latitude,
      longitude: address.longitude,
    };
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const mapRef = useRef<MapRef | null>(null);
  const fullAddressRef = useRef(fullAddressForMaps);
  const onAddressUpdateRef = useRef(onAddressUpdate);

  useEffect(() => {
    fullAddressRef.current = fullAddressForMaps;
  }, [fullAddressForMaps]);

  useEffect(() => {
    onAddressUpdateRef.current = onAddressUpdate;
  }, [onAddressUpdate]);

  const mapStyle = useMemo(
    () => (theme === "dark" ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT),
    [theme],
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setStyle(mapStyle);
  }, [mapStyle]);

  useEffect(() => {
    if (
      !isFiniteNumber(address.latitude) ||
      !isFiniteNumber(address.longitude)
    ) {
      return;
    }

    const nextCoords = {
      latitude: address.latitude,
      longitude: address.longitude,
    };
    setCoords(nextCoords);

    const map = mapRef.current?.getMap();
    if (!map) return;

    const center = map.getCenter();
    const moved =
      Math.abs(center.lat - nextCoords.latitude) > 0.0001 ||
      Math.abs(center.lng - nextCoords.longitude) > 0.0001;

    if (moved) {
      map.flyTo({
        center: [nextCoords.longitude, nextCoords.latitude],
        zoom: Math.max(map.getZoom(), 14),
        duration: 650,
        essential: true,
      });
    }
  }, [address.latitude, address.longitude]);

  useEffect(() => {
    if (prefillFlyToNonce <= 0) return;

    const query = fullAddressRef.current.trim();
    if (!query) return;

    const controller = new AbortController();

    (async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query,
        )}.json?access_token=${MAPBOX_TOKEN}`;

        const response = await fetch(url, { signal: controller.signal });
        const json = (await response.json()) as {
          features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
        };

        const coordsFromSearch = json.features?.[0]?.geometry?.coordinates;
        if (!coordsFromSearch) return;

        const [longitude, latitude] = coordsFromSearch;
        setCoords({ latitude, longitude });
        onAddressUpdateRef.current((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));

        const map = mapRef.current?.getMap();
        if (!map) return;
        map.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          duration: 900,
          essential: true,
        });
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
      }
    })();

    return () => controller.abort();
  }, [prefillFlyToNonce]);

  const updateAddressFromCoordinates = async (
    latitude: number,
    longitude: number,
  ) => {
    setCoords({ latitude, longitude });

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`,
      );
      const json = (await response.json()) as MapboxGeocodeResponse;
      const parsed = parseReverseGeocode(json);

      if (parsed) {
        onAddressUpdateRef.current((prev) => ({
          ...prev,
          streetAddress: parsed.streetAddress || prev.streetAddress,
          city: parsed.city || prev.city,
          state: parsed.state || prev.state,
          postalCode: parsed.postalCode || prev.postalCode,
          country: parsed.country || prev.country,
          latitude,
          longitude,
        }));
        return;
      }
    } catch {
      // Fall back to coordinates-only update below.
    }

    onAddressUpdateRef.current((prev) => ({
      ...prev,
      latitude,
      longitude,
    }));
  };

  const handleDragEnd = (event: MarkerDragEvent) => {
    const { lat, lng } = event.lngLat;
    void updateAddressFromCoordinates(lat, lng);
  };

  const handleMapClick = (event: MapLayerMouseEvent) => {
    const { lat, lng } = event.lngLat;
    void updateAddressFromCoordinates(lat, lng);
  };

  const copyToClipboard = () => {
    if (!coords) return;
    const text = `Lat: ${coords.latitude.toFixed(5)} | Lng: ${coords.longitude.toFixed(5)}`;
    void navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    if (coords || !navigator.geolocation || isLoadingLocation) return;

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoords(userCoords);
        onAddressUpdateRef.current((prev) => ({
          ...prev,
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
        }));
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, [coords, isLoadingLocation]);

  const initialViewState = useMemo(() => {
    if (!coords) return undefined;
    return {
      longitude: coords.longitude,
      latitude: coords.latitude,
      zoom: 14,
    };
  }, [coords]);

  return (
    <div
      id="map-preview-root"
      data-map-preview
      className={`relative isolate h-full w-full min-h-0 overflow-hidden dark:bg-surface-dark ${containerClassName ?? ""}`}
    >
      {coords ? (
        <div className="relative h-full min-h-0">
          <div className="absolute inset-0 z-0">
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={initialViewState}
              mapStyle={mapStyle}
              style={{ width: "100%", height: "100%" }}
              onClick={handleMapClick}
            >
              <NavigationControl position="bottom-right" />
              <FullscreenControl position="bottom-right" />
              <Marker
                longitude={coords.longitude}
                latitude={coords.latitude}
                draggable
                onDragEnd={handleDragEnd}
                anchor="bottom"
              >
                <div className="h-5 w-5 rounded-full border-2 border-white bg-brand-primary shadow-md" />
              </Marker>
            </Map>
          </div>

          <div className="absolute left-2 top-2 z-10 rounded-lg bg-white/90 px-2 py-1 text-xs text-text-base shadow-md dark:bg-black/60 dark:text-text-inverted">
            Click map to place pin. Drag pin to fine-tune.
          </div>

          <div className="absolute bottom-8 left-2 z-10">
            <div className="flex items-center gap-2 rounded-lg bg-white/90 px-2 py-1 text-xs text-text-base shadow-md backdrop-blur-sm dark:bg-black/60 dark:text-text-inverted">
              <span className="whitespace-nowrap">
                Lat: {coords.latitude.toFixed(5)} | Lng:{" "}
                {coords.longitude.toFixed(5)}
              </span>
              <button
                type="button"
                onClick={copyToClipboard}
                aria-label="Copy coordinates to clipboard"
                className="ml-2 flex-shrink-0 transition hover:text-primary"
              >
                <HiClipboard className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-0 items-center justify-center px-2 text-center text-sm italic text-text-base dark:text-text-inverted">
          {isLoadingLocation ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" />
              <span>Getting your location...</span>
            </div>
          ) : (
            <span>Search an address or click the map to set location.</span>
          )}
        </div>
      )}
    </div>
  );
};

export default MapPreview;
