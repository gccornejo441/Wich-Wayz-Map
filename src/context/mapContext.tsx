import React, { createContext, useContext, useEffect, useState } from "react";


type MapContextType = {
  center: [number, number]  | null;
  setCenter: React.Dispatch<React.SetStateAction<[number, number]  | null>>;
  shopId: string | null;
  setShopId: React.Dispatch<React.SetStateAction<string | null>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  userInteracted: boolean;
  setUserInteracted: React.Dispatch<React.SetStateAction<boolean>>;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [center, setCenter] = useState<[number, number]  | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(13);
  const [userInteracted, setUserInteracted] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat") || "");
    const lng = parseFloat(params.get("lng") || "");
    const id = params.get("shopId");

    if (!isNaN(lat) && !isNaN(lng)) {
      setCenter([lat, lng]);
      setZoom(30);
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
      }}
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
