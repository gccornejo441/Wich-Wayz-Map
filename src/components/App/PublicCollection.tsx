import { useEffect, useMemo, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl";
import { useParams } from "react-router-dom";
import { FiMapPin, FiShare2 } from "react-icons/fi";
import { GiSandwich } from "react-icons/gi";
import { getPublicCollection } from "@services/collectionService";
import { CollectionWithShops } from "@models/Collection";
import { buildShopGeoJson, type ShopFeature } from "@utils/shopGeoJson";
import "mapbox-gl/dist/mapbox-gl.css";
import { useToast } from "@context/toastContext";

const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

const PublicCollection = () => {
  const { id } = useParams();
  const { addToast } = useToast();
  const [collection, setCollection] = useState<CollectionWithShops | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -73.935242,
    latitude: 40.73061,
    zoom: 11,
  });

  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("Collection not found.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicCollection(Number(id));
        setCollection(data);

        const features = buildShopGeoJson(data.shops).features;
        if (features.length > 0) {
          const [lng, lat] = features[0].geometry.coordinates;
          setViewState((prev) => ({
            ...prev,
            longitude: lng,
            latitude: lat,
            zoom: 12,
          }));
        }
      } catch (err) {
        console.error("Failed to load public collection:", err);
        setError("Collection not found or unavailable.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const features = useMemo<ShopFeature[]>(() => {
    if (!collection?.shops) return [];
    return buildShopGeoJson(collection.shops).features;
  }, [collection]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      addToast("Link copied to clipboard", "success");
    } catch (err) {
      console.error("Failed to copy link:", err);
      addToast("Could not copy link", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-primary">
        <GiSandwich className="animate-spin text-2xl mr-2" />
        Loading collection...
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="max-w-3xl mx-auto my-8 bg-white dark:bg-surface-dark rounded-xl shadow-card p-6 text-center">
        <p className="text-lg font-semibold text-text-base dark:text-text-inverted">
          {error ?? "Collection unavailable"}
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto my-8 bg-white dark:bg-surface-dark rounded-xl shadow-card p-6 text-center">
        <p className="text-lg font-semibold text-text-base dark:text-text-inverted">
          Mapbox access token is missing.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <div className="lg:col-span-1 bg-white dark:bg-surface-dark rounded-xl shadow-card border border-surface-muted dark:border-gray-700 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-base dark:text-text-inverted">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-sm text-text-muted dark:text-text-inverted/70 mt-1">
                {collection.description}
              </p>
            )}
            <p className="text-xs uppercase tracking-wide text-text-muted dark:text-text-inverted/60 mt-2">
              {collection.visibility} • {collection.shopCount ?? features.length} shops
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 rounded-lg bg-brand-primary text-white hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            aria-label="Copy share link"
          >
            <FiShare2 />
          </button>
        </div>

        <div className="divide-y divide-surface-muted dark:divide-gray-700 max-h-[60vh] overflow-y-auto pr-1">
          {features.map((feature) => {
            const coords = feature.geometry.coordinates;
            const props = feature.properties;
            return (
              <div
                key={`${props.shopId}-${props.locationId ?? "loc"}`}
                className="py-3 cursor-pointer hover:bg-surface-muted dark:hover:bg-surface-darker rounded-lg px-2"
                onClick={() =>
                  setViewState((prev) => ({
                    ...prev,
                    longitude: coords[0],
                    latitude: coords[1],
                    zoom: 14,
                  }))
                }
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-text-base dark:text-text-inverted">
                    {props.shopName}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted dark:bg-surface-darker text-text-muted dark:text-text-inverted/70">
                    {props.categories?.split(",").slice(0, 1).join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted dark:text-text-inverted/70 mt-1">
                  <FiMapPin />
                  <span className="truncate">
                    {props.address || props.city || "Address unavailable"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-2 h-[70vh] lg:h-[calc(100vh-200px)] rounded-xl overflow-hidden shadow-card border border-surface-muted dark:border-gray-700">
        <Map
          {...viewState}
          onMove={(event) => setViewState(event.viewState)}
          mapboxAccessToken={token}
          mapStyle={MAP_STYLE}
        >
          <NavigationControl position="top-right" />
          {features.map((feature) => {
            const [lng, lat] = feature.geometry.coordinates;
            return (
              <Marker
                key={`${feature.properties.shopId}-${feature.properties.locationId ?? "loc"}`}
                longitude={lng}
                latitude={lat}
                anchor="bottom"
              >
                <div className="bg-brand-primary text-white rounded-full p-2 shadow-lg">
                  <FiMapPin />
                </div>
              </Marker>
            );
          })}
        </Map>
      </div>
    </div>
  );
};

export default PublicCollection;
