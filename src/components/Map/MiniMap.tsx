import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix default Leaflet icon issue
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MiniMapProps {
  position: [number, number];
  onMarkerDragEnd: (event: L.DragEndEvent) => void;
}

const MiniMap = ({ position, onMarkerDragEnd }: MiniMapProps) => {
  return (
    <MapContainer
      center={position}
      zoom={13}
      scrollWheelZoom={false}
      className="w-full h-64 rounded-lg overflow-hidden"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker
        position={position}
        draggable={true}
        eventHandlers={{
          dragend: onMarkerDragEnd,
        }}
      />
    </MapContainer>
  );
};

export default MiniMap;
