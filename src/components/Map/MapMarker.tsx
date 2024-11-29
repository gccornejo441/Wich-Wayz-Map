import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Popper } from "./Popper";
import { ShopMarker } from "../../types/dataTypes";
import { useEffect, useRef } from "react";

const sandwichIcon = new L.Icon({
  iconUrl: "/sandwich-pin.svg",
  iconSize: [50, 50],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const MapMarker = ({
  position,
  popupContent,
  autoOpen,
  isPopupEnabled = true,
}: ShopMarker) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (autoOpen && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [autoOpen]);

  return (
    <Marker
      icon={sandwichIcon}
      position={position}
      ref={(ref) => {
        if (ref) {
          markerRef.current = ref;
        }
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
