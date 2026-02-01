import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Coords = [number, number];
type NearbyMode = "mapCenter" | "userLocation";

type FlyToTrigger = {
  lng: number;
  lat: number;
  zoom: number;
  timestamp: number;
};

type MapContextType = {
  center: Coords | null;
  setCenter: React.Dispatch<React.SetStateAction<Coords | null>>;

  shopId: string | null;
  setShopId: React.Dispatch<React.SetStateAction<string | null>>;

  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;

  userInteracted: boolean;
  setUserInteracted: React.Dispatch<React.SetStateAction<boolean>>;

  userPosition: Coords | null;
  setUserPosition: React.Dispatch<React.SetStateAction<Coords | null>>;

  flyToLocation: (lng: number, lat: number, zoom: number) => void;
  flyToTrigger: FlyToTrigger | null;

  isNearbyOpen: boolean;
  setIsNearbyOpen: React.Dispatch<React.SetStateAction<boolean>>;

  nearbyMode: NearbyMode;
  setNearbyMode: React.Dispatch<React.SetStateAction<NearbyMode>>;

  nearbyRadiusMiles: number;
  setNearbyRadiusMiles: React.Dispatch<React.SetStateAction<number>>;

  nearbyAnchorCoords: Coords | null;
  setNearbyAnchorCoords: React.Dispatch<React.SetStateAction<Coords | null>>;

  pendingCenterCoords: Coords | null;
  setPendingCenterCoords: React.Dispatch<React.SetStateAction<Coords | null>>;

  hoveredLocationId: number | null;
  setHoveredLocationId: React.Dispatch<React.SetStateAction<number | null>>;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

type NearbyPrefs = {
  isNearbyOpen: boolean;
  nearbyMode: NearbyMode;
  nearbyRadiusMiles: number;
};

const NEARBY_PREFS_KEY = "wichwayz_nearby_prefs_v1";

const loadNearbyPrefs = (): NearbyPrefs | null => {
  try {
    const raw = localStorage.getItem(NEARBY_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NearbyPrefs>;

    const mode =
      parsed.nearbyMode === "mapCenter" || parsed.nearbyMode === "userLocation"
        ? parsed.nearbyMode
        : "mapCenter";

    const radius =
      typeof parsed.nearbyRadiusMiles === "number" &&
      Number.isFinite(parsed.nearbyRadiusMiles)
        ? parsed.nearbyRadiusMiles
        : 5;

    return {
      isNearbyOpen: !!parsed.isNearbyOpen,
      nearbyMode: mode,
      nearbyRadiusMiles: radius,
    };
  } catch {
    return null;
  }
};

const saveNearbyPrefs = (prefs: NearbyPrefs) => {
  try {
    localStorage.setItem(NEARBY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    return;
  }
};

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialNearbyPrefs = useMemo(() => loadNearbyPrefs(), []);

  const [center, setCenter] = useState<Coords | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(13);
  const [userInteracted, setUserInteracted] = useState<boolean>(false);

  const [userPosition, setUserPosition] = useState<Coords | null>(null);

  const [flyToTrigger, setFlyToTrigger] = useState<FlyToTrigger | null>(null);

  const [isNearbyOpen, setIsNearbyOpen] = useState<boolean>(
    () => initialNearbyPrefs?.isNearbyOpen ?? false,
  );
  const [nearbyMode, setNearbyMode] = useState<NearbyMode>(
    () => initialNearbyPrefs?.nearbyMode ?? "mapCenter",
  );
  const [nearbyRadiusMiles, setNearbyRadiusMiles] = useState<number>(
    () => initialNearbyPrefs?.nearbyRadiusMiles ?? 5,
  );
  const [nearbyAnchorCoords, setNearbyAnchorCoords] = useState<Coords | null>(
    null,
  );
  const [pendingCenterCoords, setPendingCenterCoords] = useState<Coords | null>(
    null,
  );
  const [hoveredLocationId, setHoveredLocationId] = useState<number | null>(
    null,
  );

  const flyToLocation = (lng: number, lat: number, zoomValue: number) => {
    setFlyToTrigger({ lng, lat, zoom: zoomValue, timestamp: Date.now() });
  };

  useEffect(() => {
    saveNearbyPrefs({ isNearbyOpen, nearbyMode, nearbyRadiusMiles });
  }, [isNearbyOpen, nearbyMode, nearbyRadiusMiles]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat") || "");
    const lng = parseFloat(params.get("lng") || "");
    const id = params.get("shopId");

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      const centerCoords: Coords = [lng, lat];
      setCenter(centerCoords);
      setZoom(30);
      setPendingCenterCoords(centerCoords);
    }

    if (id) {
      setShopId(id);
    }
  }, []);

  return (
    <MapContext.Provider
      value={{
        center,
        setCenter,
        shopId,
        setShopId,
        zoom,
        setZoom,
        userInteracted,
        setUserInteracted,
        userPosition,
        setUserPosition,
        flyToLocation,
        flyToTrigger,
        isNearbyOpen,
        setIsNearbyOpen,
        nearbyMode,
        setNearbyMode,
        nearbyRadiusMiles,
        setNearbyRadiusMiles,
        nearbyAnchorCoords,
        setNearbyAnchorCoords,
        pendingCenterCoords,
        setPendingCenterCoords,
        hoveredLocationId,
        setHoveredLocationId,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within a MapProvider");
  }
  return context;
};
