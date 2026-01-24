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
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const mapRef = useRef<MapRef | null>(null);

  const mapStyle =
    theme === "dark"
      ? "mapbox://styles/mapbox/navigation-night-v1"
      : "mapbox://styles/mapbox/streets-v12";

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getMap().setStyle(mapStyle);
    }
  }, [mapStyle]);

  // Forward geocoding: use fullAddressForMaps prop
  useEffect(() => {
    if (!fullAddressForMaps) return;
    const timeout = setTimeout(() => {
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          fullAddressForMaps,
        )}.json?access_token=${MAPBOX_TOKEN}`,
      )
        .then((r) => r.json())
        .then((json) => {
          if (json.features?.length) {
            const [lon, lat] = json.features[0].geometry.coordinates;
            setCoords({ latitude: lat, longitude: lon });

            // Fly to the new coordinates if map is ready
            if (mapRef.current) {
              mapRef.current.flyTo({
                center: [lon, lat],
                zoom: 14,
                duration: 900,
              });
            }
          }
        });
    }, 400);
    return () => clearTimeout(timeout);
  }, [fullAddressForMaps, prefillFlyToNonce]);

  // Reverse geocoding: return structured AddressDraft
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

          // Extract address components from Mapbox geocode result
          let street = "";
          let city = "";
          let state = "";
          let postalCode = "";
          let country = "";

          // Mapbox returns address in feature.place_name and context array
          // feature.place_type tells us what kind of place this is
          if (feature.address && feature.text) {
            street = `${feature.address} ${feature.text}`;
          } else if (feature.text) {
            street = feature.text;
          }

          // Parse context array for city, state, postal code, country
          for (const ctx of context) {
            const id = ctx.id || "";
            if (id.startsWith("postcode")) {
              postalCode = ctx.text || "";
            } else if (id.startsWith("place")) {
              city = ctx.text || "";
            } else if (id.startsWith("region")) {
              // Extract state code - Mapbox returns US-XX format in short_code
              const stateValue = ctx.short_code?.replace("US-", "") || ctx.text || "";
              // Convert to 2-letter code if full name was returned
              state = getStateCode(stateValue);
            } else if (id.startsWith("country")) {
              country = ctx.short_code?.toUpperCase() || ctx.text || "";
            }
          }

          // Call onAddressUpdate with structured update
          onAddressUpdate({
            ...address, // Preserve streetAddressSecond and other fields
            streetAddress: street,
            city,
            state, // Will be 2-letter state code
            postalCode,
            country: country || address.country, // Fallback to existing country
            latitude: lat,
            longitude: lng,
          });
        }
      });
  };

  const copyToClipboard = () => {
    if (!coords) return;
    const text = `Lat: ${coords.latitude.toFixed(5)} | Lng: ${coords.longitude.toFixed(5)}`;
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
          Type an address or drag the pin to set the location.
        </div>
      )}
    </div>
  );
};

export default MapPreview;
