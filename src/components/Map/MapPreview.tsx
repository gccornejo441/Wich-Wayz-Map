import { useEffect, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  FullscreenControl,
  MarkerDragEvent,
} from "react-map-gl";
import { HiClipboard } from "react-icons/hi";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

interface MapPreviewProps {
  address: string;
  onAddressUpdate: (addr: string) => void;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

const MapPreview: React.FC<MapPreviewProps> = ({
  address,
  onAddressUpdate,
}) => {
  const [coords, setCoords] = useState<Coordinates | null>(null);

  useEffect(() => {
    if (!address) return;
    const timeout = setTimeout(() => {
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          address,
        )}.json?access_token=${MAPBOX_TOKEN}`,
      )
        .then((r) => r.json())
        .then((json) => {
          if (json.features?.length) {
            const [lon, lat] = json.features[0].geometry.coordinates;
            setCoords({ latitude: lat, longitude: lon });
          }
        });
    }, 400);
    return () => clearTimeout(timeout);
  }, [address]);

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
          onAddressUpdate(json.features[0].place_name);
        }
      });
  };

  const copyToClipboard = () => {
    if (!coords) return;
    const text = `Lat: ${coords.latitude.toFixed(5)} | Lng: ${coords.longitude.toFixed(5)}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full h-fit rounded-lg overflow-hidden shadow-sm bg-lightGray dark:bg-surface-dark p-2">
      {coords ? (
        <>
          <Map
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{
              longitude: coords.longitude,
              latitude: coords.latitude,
              zoom: 14,
            }}
            mapStyle="mapbox://styles/mapbox/streets-v11"
            style={{ width: "100%", height: "256px" }}
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
