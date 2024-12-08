import React, { createContext, useContext, useEffect, useState } from "react";
import { LatLngTuple } from "leaflet";

type MapContextType = {
  center: LatLngTuple | null;
  setCenter: React.Dispatch<React.SetStateAction<LatLngTuple | null>>;
  shopId: string | null;
  setShopId: React.Dispatch<React.SetStateAction<string | null>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [center, setCenter] = useState<LatLngTuple | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(13);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat") || "");
    const lng = parseFloat(params.get("lng") || "");
    const id = params.get("shopId");

    if (!isNaN(lat) && !isNaN(lng)) {
      setCenter([lat, lng]);
      setZoom(15);
    }

    if (id) {
      setShopId(id);
    }
  }, []);

  return (
    <MapContext.Provider
      value={{ center, setCenter, shopId, setShopId, zoom, setZoom }}
    >
      {children}
    </MapContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within a MapProvider");
  }
  return context;
};
