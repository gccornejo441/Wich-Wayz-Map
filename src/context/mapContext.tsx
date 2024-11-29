import React, { createContext, useContext, useState } from "react";
import { LatLngTuple } from "leaflet";

type MapContextType = {
  center: LatLngTuple | null;
  setCenter: React.Dispatch<React.SetStateAction<LatLngTuple | null>>;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [center, setCenter] = useState<LatLngTuple | null>(null);

  return (
    <MapContext.Provider value={{ center, setCenter }}>
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
