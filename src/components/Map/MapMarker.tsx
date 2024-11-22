import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Popper } from "./Popper";
import { ShopMarker } from "../../types/dataTypes";

const sandwichIcon = new L.Icon({
  iconUrl: "/sandwich.png",
  iconSize: [30, 30],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const MapMarker = ({
  position,
  popupContent,
  isPopupEnabled = true,
}: ShopMarker) => {
  return (
    <Marker icon={sandwichIcon} position={position}>
      {isPopupEnabled && (
        <Popup>
          <Popper {...popupContent} />
        </Popup>
      )}
    </Marker>
  );
};

export default MapMarker;
