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
  const [mapStyle, setMapStyle] = useState(
    document.documentElement.classList.contains("dark")
      ? "mapbox://styles/mapbox/navigation-night-v1"
      : "mapbox://styles/mapbox/streets-v12",
  );
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      const style = isDark
        ? "mapbox://styles/mapbox/navigation-night-v1"
        : "mapbox://styles/mapbox/streets-v12";
      setMapStyle(style);
      mapRef.current?.getMap().setStyle(style);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

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
