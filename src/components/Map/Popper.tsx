import { PopupContent } from "../../types/dataTypes";

export const Popper = ({ shopName, address, description }: PopupContent) => {
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${shopName} ${address}`,
  )}`;

  return (
    <div className="w-64 font-sans">
      <h4 className="text-lg font-semibold text-dark">{shopName}</h4>
      <p className="text-primary">{description}</p>

      <div className="bg-gray-100 px-2 py-2 mb-2 rounded-lg">
        <span className="text-dark">{address}</span>
        <a
          href={googleMapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-bold underline mt-3 block"
        >
          Open on Google Maps
        </a>
      </div>
    </div>
  );
};
