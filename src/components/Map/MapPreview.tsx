import { useEffect, useRef, useState } from "react";
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
  onAddressUpdate: (next: AddressDraft) => void;
  prefillFlyToNonce: number;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

const MapPreview: React.FC<MapPreviewProps> = ({
  address,
  fullAddressForMaps,
  onAddressUpdate,
  prefillFlyToNonce,
}) => {
  const { theme } = useTheme();

  const [coords, setCoords] = useState<Coordinates | null>(() => {
    if (
      typeof address.latitude === "number" &&
      typeof address.longitude === "number"
    ) {
      return { latitude: address.latitude, longitude: address.longitude };
    }
    return null;
  });

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

  const mapStyle =
    theme === "dark"
      ? "mapbox://styles/mapbox/navigation-night-v1"
      : "mapbox://styles/mapbox/streets-v12";

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getMap().setStyle(mapStyle);
    }
  }, [mapStyle]);

  // Forward-geocoding: Only runs when prefillFlyToNonce changes (button click)
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

        onAddressUpdateRef.current({
          ...addressRef.current,
          latitude: lat,
          longitude: lon,
        });

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lon, lat],
            zoom: 14,
            duration: 900,
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

          onAddressUpdateRef.current({
            ...addressRef.current,
            streetAddress: street,
            city,
            state,
            postalCode,
            country: country || addressRef.current.country,
            latitude: lat,
            longitude: lng,
          });
        }
      });
  };

  const copyToClipboard = () => {
    if (!coords) return;
    const text = `Lat: ${coords.latitude.toFixed(5)} | Lng: ${coords.longitude.toFixed(
      5,
    )}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-sm bg-lightGray dark:bg-surface-dark p-2 flex flex-col">
      {coords ? (
        <>
          <div className="flex-1 relative">
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{
                longitude: coords.longitude,
                latitude: coords.latitude,
                zoom: 14,
              }}
              mapStyle={mapStyle}
              style={{ width: "100%", height: "100%" }}
            >
              <NavigationControl position="top-right" />
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
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-text-base dark:text-text-inverted">
            <span>
              Lat: {coords.latitude.toFixed(5)} | Lng:{" "}
              {coords.longitude.toFixed(5)}
            </span>
            <button
              onClick={copyToClipboard}
              aria-label="Copy coordinates to clipboard"
              className="hover:text-primary transition"
            >
              <HiClipboard className="w-5 h-5" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64 text-sm italic px-2 text-center text-text-base dark:text-text-inverted">
          Click Prefill Address to set the map location.
        </div>
      )}
    </div>
  );
};

export default MapPreview;
