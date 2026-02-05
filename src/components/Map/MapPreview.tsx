import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  FullscreenControl,
  MarkerDragEvent,
  MapRef,
} from "react-map-gl";
import { HiClipboard } from "react-icons/hi";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "@hooks/useTheme";
import { AddressDraft } from "@/types/address";
import { getStateCode } from "@constants/usStates";

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

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

// Styles (fix 404s by using dark-v11)
const MAPBOX_STYLE_LIGHT = "mapbox://styles/mapbox/streets-v12";
const MAPBOX_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";

const MapPreview: React.FC<MapPreviewProps> = ({
  address,
  fullAddressForMaps,
  onAddressUpdate,
  prefillFlyToNonce,
  containerClassName,
}) => {
  const { theme } = useTheme();

  const [coords, setCoords] = useState<Coordinates | null>(() => {
    if (isFiniteNumber(address.latitude) && isFiniteNumber(address.longitude)) {
      return { latitude: address.latitude, longitude: address.longitude };
    }
    return null;
  });

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const mapRef = useRef<MapRef | null>(null);
  const fullAddressRef = useRef(fullAddressForMaps);
  const addressRef = useRef(address);
  const onAddressUpdateRef = useRef(onAddressUpdate);

  useEffect(() => {
    fullAddressRef.current = fullAddressForMaps;
  }, [fullAddressForMaps]);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  useEffect(() => {
    onAddressUpdateRef.current = onAddressUpdate;
  }, [onAddressUpdate]);

  // ✅ Map style (fix 404s)
  const mapStyle = useMemo(
    () => (theme === "dark" ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT),
    [theme],
  );

  // ✅ Update style without recreating map
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setStyle(mapStyle);
  }, [mapStyle]);

  // ✅ Keep state in sync if address props get lat/lon later
  useEffect(() => {
    if (isFiniteNumber(address.latitude) && isFiniteNumber(address.longitude)) {
      setCoords({ latitude: address.latitude, longitude: address.longitude });
    }
  }, [address.latitude, address.longitude]);

  // Prefill address -> forward geocode -> set coords -> flyTo
  useEffect(() => {
    if (prefillFlyToNonce <= 0) return;

    const query = fullAddressRef.current;
    if (!query) return;

    const controller = new AbortController();

    (async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query,
        )}.json?access_token=${MAPBOX_TOKEN}`;

        const r = await fetch(url, { signal: controller.signal });
        const json = await r.json();

        if (!json.features?.length) return;

        const [lon, lat] = json.features[0].geometry.coordinates;

        setCoords({ latitude: lat, longitude: lon });
        onAddressUpdateRef.current((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon,
        }));

        const m = mapRef.current?.getMap();
        if (m) {
          m.flyTo({
            center: [lon, lat],
            zoom: 14,
            duration: 900,
            essential: true,
          });
        }
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
      }
    })();

    return () => controller.abort();
  }, [prefillFlyToNonce]);

  const handleDragEnd = (e: MarkerDragEvent) => {
    const { lat, lng } = e.lngLat;
    const newCoords = { latitude: lat, longitude: lng };
    setCoords(newCoords);

    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`,
    )
      .then((r) => r.json())
      .then((json) => {
        if (json.features?.length) {
          const feature = json.features[0];
          const context = feature.context || [];

          let street = "";
          let city = "";
          let state = "";
          let postalCode = "";
          let country = "";

          if (feature.address && feature.text) {
            street = `${feature.address} ${feature.text}`;
          } else if (feature.text) {
            street = feature.text;
          }

          for (const ctx of context) {
            const id = ctx.id || "";
            if (id.startsWith("postcode")) {
              postalCode = ctx.text || "";
            } else if (id.startsWith("place")) {
              city = ctx.text || "";
            } else if (id.startsWith("region")) {
              const stateValue =
                ctx.short_code?.replace("US-", "") || ctx.text || "";
              state = getStateCode(stateValue);
            } else if (id.startsWith("country")) {
              country = ctx.short_code?.toUpperCase() || ctx.text || "";
            }
          }

          onAddressUpdateRef.current((prev) => ({
            ...prev,
            streetAddress: street || prev.streetAddress,
            city: city || prev.city,
            state: state || prev.state,
            postalCode: postalCode || prev.postalCode,
            country: country || prev.country,
            latitude: lat,
            longitude: lng,
          }));
        } else {
          onAddressUpdateRef.current((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));
        }
      })
      .catch(() => {
        onAddressUpdateRef.current((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
      });
  };

  const copyToClipboard = () => {
    if (!coords) return;
    const text = `Lat: ${coords.latitude.toFixed(5)} | Lng: ${coords.longitude.toFixed(5)}`;
    navigator.clipboard.writeText(text);
  };

  // Initialize with user's current location if no coordinates provided
  useEffect(() => {
    if (coords) return;
    if (!navigator.geolocation) return;
    if (isLoadingLocation) return;

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
      className={`relative isolate w-full h-full overflow-hidden dark:bg-surface-dark flex flex-col min-h-0 ${
        containerClassName ?? ""
      }`}
    >
      {coords ? (
        <div className="relative flex-1 min-h-0">
          {/* Map container with pointer-events-none to prevent blocking form clicks.
              To enable interactive map preview (pan, zoom controls), remove pointer-events-none,
              but ensure the preview container never overlaps the form area to avoid click conflicts. */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={initialViewState}
              mapStyle={mapStyle}
              style={{ width: "100%", height: "100%" }}
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
                <div className="text-xl cursor-pointer">📍</div>
              </Marker>
            </Map>
          </div>

          {/* ✅ Overlay on top */}
          <div className="absolute left-2 bottom-8 z-10">
            <div className="bg-white/90 dark:bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-2 text-xs text-text-base dark:text-text-inverted shadow-md">
              <span className="whitespace-nowrap">
                Lat: {coords.latitude.toFixed(5)} | Lng:{" "}
                {coords.longitude.toFixed(5)}
              </span>
              <button
                type="button"
                onClick={copyToClipboard}
                aria-label="Copy coordinates to clipboard"
                className="ml-2 hover:text-primary transition flex-shrink-0"
              >
                <HiClipboard className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-center justify-center text-sm italic px-2 text-center text-text-base dark:text-text-inverted">
          {isLoadingLocation ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
              <span>Getting your location...</span>
            </div>
          ) : (
            <span>Click Prefill Address to set the map location.</span>
          )}
        </div>
      )}
    </div>
  );
};

export default MapPreview;
