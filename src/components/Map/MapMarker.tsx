// import { useEffect, useMemo, useRef } from "react";
// import mapboxgl from "mapbox-gl";
// import ReactDOMServer from "react-dom/server";
// import { Popper } from "./Popper";
// import { ShopMarker } from "./MapBox"; // ShopMarker type with popupContent property

// interface MapMarkerProps extends ShopMarker {
//   map: mapboxgl.Map;
// }

// const MapMarker = ({
//   map,
//   position,
//   popupContent,
//   autoOpen,
//   isPopupEnabled = true,
// }: MapMarkerProps) => {
//   const markerRef = useRef<mapboxgl.Marker | null>(null);
//   const hoverMarkerRef = useRef<mapboxgl.Marker | null>(null); // Track hover marker separately

//   // Memoize validPosition so that it only changes when `position` changes.
//   const validPosition = useMemo(
//     () => [position[0], position[1]] as [number, number],
//     [position]
//   );

//   // Helper: create an icon element with the given size.
//   const createIconElement = (size: number) => {
//     const el = document.createElement("div");
//     el.className = "mapbox-marker";
//     el.style.width = `${size}px`;
//     el.style.height = `${size}px`;
//     el.style.backgroundImage = "url('/sandwich-pin.svg')";
//     el.style.backgroundSize = "contain";
//     el.style.cursor = "pointer";
//     return el;
//   };

//   useEffect(() => {
//     if (!map) return;

//     // Create default icon element.
//     const el = createIconElement(50);

//     // Create the marker at the valid position.
//     const marker = new mapboxgl.Marker({ element: el })
//       .setLngLat(validPosition)
//       .addTo(map);
//     markerRef.current = marker;

//     // Create and attach a popup if enabled.
//     let popup: mapboxgl.Popup | null = null;
//     if (isPopupEnabled) {
//       const popupHtml = ReactDOMServer.renderToString(
//         <Popper
//           position={position}
//           popupContent={popupContent}
//           isPopupEnabled={isPopupEnabled}
//         />
//       );
//       popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml);
//       marker.setPopup(popup);
//       if (autoOpen) {
//         popup.addTo(map);
//       }
//     }

//     // Hover effect: on mouseenter, replace the marker with a larger icon.
//     const handleMouseOver = () => {
//       if (hoverMarkerRef.current) return; // Prevent duplicate hover markers

//       // Hide the original marker while hovering
//       el.style.display = "none"; 

//       const hoverEl = createIconElement(60);
//       hoverMarkerRef.current = new mapboxgl.Marker({ element: hoverEl })
//         .setLngLat(validPosition)
//         .addTo(map);
//     };

//     // On mouseleave, remove hover marker and show the original marker again.
//     const handleMouseOut = () => {
//       if (hoverMarkerRef.current) {
//         hoverMarkerRef.current.remove();
//         hoverMarkerRef.current = null;
//       }

//       // Show the original marker again
//       el.style.display = "block"; 
//     };

//     el.addEventListener("mouseenter", handleMouseOver);
//     el.addEventListener("mouseleave", handleMouseOut);

//     return () => {
//       el.removeEventListener("mouseenter", handleMouseOver);
//       el.removeEventListener("mouseleave", handleMouseOut);
//       marker.remove();
//       if (hoverMarkerRef.current) {
//         hoverMarkerRef.current.remove();
//         hoverMarkerRef.current = null;
//       }
//     };
//   }, [map, validPosition, popupContent, autoOpen, isPopupEnabled]);

//   return null;
// };

// export default MapMarker;

