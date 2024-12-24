import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Popper } from "./Popper";
import { ShopMarker } from "../../types/dataTypes";
import { useEffect, useRef, useState } from "react";

const defaultIcon = new L.Icon({
  iconUrl: "/sandwich-pin.svg",
  iconSize: [50, 50],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const hoverIcon = new L.Icon({
  iconUrl: "/sandwich-pin.svg", 
  iconSize: [60, 60],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
});

const MapMarker = ({
  position,
  popupContent,
  autoOpen,
  isPopupEnabled = true,
}: ShopMarker) => {
  const markerRef = useRef<L.Marker | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (autoOpen && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [autoOpen]);

  return (
    <Marker
      icon={isHovered ? hoverIcon : defaultIcon}
      position={position}
      ref={(ref) => {
        if (ref) {
          markerRef.current = ref;
        }
      }}
      eventHandlers={{
        mouseover: () => setIsHovered(true),
        mouseout: () => setIsHovered(false),
      }}
    >
      {isPopupEnabled && (
        <Popup autoClose={true}>
          <Popper {...popupContent} />
        </Popup>
      )}
    </Marker>
  );
};

export default MapMarker;