import { useEffect, useMemo, useRef, useState } from "react";
import { HiClipboard } from "react-icons/hi";
import Map, {
  FullscreenControl,
  MapMouseEvent,
  MapRef,
  Marker,
  MarkerDragEvent,
  NavigationControl,
} from "react-map-gl/mapbox";

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
  interactive?: boolean;
  draggableMarker?: boolean;
  showControls?: boolean;
  enableGeolocation?: boolean;
  showCoordinateCopy?: boolean;
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

const hasValidCoords = (lat: number, lon: number): boolean =>
  lat !== 0 || lon !== 0;

const MAPBOX_STYLE_LIGHT = "mapbox://styles/mapbox/streets-v12";
const MAPBOX_STYLE_DARK = "mapbox://styles/mapbox/navigation-night-v1";
const DEFAULT_VIEW_STATE = {
  longitude: -74.0242,
  latitude: 40.6941,
  zoom: 10,
};

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
  interactive = true,
  draggableMarker = true,
  showControls = true,
  enableGeolocation = true,
  showCoordinateCopy = true,
}) => {
  const { theme } = useTheme();
  const [coords, setCoords] = useState<Coordinates | null>(() => {
    if (
      !isFiniteNumber(address.latitude) ||
      !isFiniteNumber(address.longitude) ||
      !hasValidCoords(address.latitude, address.longitude)
    ) {
      return null;
    }
    return {
      latitude: address.latitude,
      longitude: address.longitude,
    };
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [geolocationFailed, setGeolocationFailed] = useState(false);

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
      !isFiniteNumber(address.longitude) ||
      !hasValidCoords(address.latitude, address.longitude)
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
    if (!interactive) return;

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

  const handleMapClick = (event: MapMouseEvent) => {
    const { lat, lng } = event.lngLat;
    void updateAddressFromCoordinates(lat, lng);
  };

  const copyToClipboard = () => {
    if (!coords) return;
    const text = `Lat: ${coords.latitude.toFixed(5)} | Lng: ${coords.longitude.toFixed(5)}`;
    void navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    if (
      !enableGeolocation ||
      coords ||
      !navigator.geolocation ||
      isLoadingLocation
    ) {
      return;
    }

    setIsLoadingLocation(true);
    setGeolocationFailed(false);
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
        setGeolocationFailed(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, [coords, enableGeolocation, isLoadingLocation]);

  const initialViewState = useMemo(() => {
    if (!coords) return DEFAULT_VIEW_STATE;
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
      <div className="relative h-full min-h-0">
        {enableGeolocation && !coords && isLoadingLocation ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface-light dark:bg-surface-dark">
            <svg
              className="h-8 w-8 animate-spin text-text-muted"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-text-muted">Getting your location...</p>
          </div>
        ) : (
          <div className="absolute inset-0 z-0">
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={initialViewState}
              mapStyle={mapStyle}
              style={{ width: "100%", height: "100%" }}
              interactive={interactive}
              onClick={interactive ? handleMapClick : undefined}
            >
              {showControls ? (
                <>
                  <NavigationControl position="bottom-right" />
                  <FullscreenControl position="bottom-right" />
                </>
              ) : null}
              {coords ? (
                <Marker
                  longitude={coords.longitude}
                  latitude={coords.latitude}
                  draggable={interactive && draggableMarker}
                  onDragEnd={
                    interactive && draggableMarker ? handleDragEnd : undefined
                  }
                  anchor="bottom"
                >
                  <div className="h-5 w-5 rounded-full border-2 border-white bg-brand-primary shadow-md" />
                </Marker>
              ) : null}
            </Map>
          </div>
        )}

        <div className="absolute left-2 top-2 z-10 rounded-lg bg-white/90 px-2 py-1 text-xs text-text-base shadow-md dark:bg-black/60 dark:text-text-inverted">
          {!interactive
            ? "Pinned location"
            : coords
              ? "Click map to place pin. Drag pin to fine-tune."
              : isLoadingLocation
                ? "Getting your location..."
                : geolocationFailed
                  ? "Location unavailable. Click map to place pin."
                  : "Click map to place pin."}
        </div>

        {!coords && geolocationFailed && !isLoadingLocation ? (
          <div className="absolute bottom-8 left-2 z-10">
            <button
              type="button"
              onClick={() => {
                setGeolocationFailed(false);
                setIsLoadingLocation(false);
              }}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-text-base shadow-md backdrop-blur-sm hover:bg-white dark:bg-black/60 dark:text-text-inverted dark:hover:bg-black/80"
            >
              Retry location detection
            </button>
          </div>
        ) : null}

        {coords && showCoordinateCopy ? (
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
        ) : null}
      </div>
    </div>
  );
};

export default MapPreview;
