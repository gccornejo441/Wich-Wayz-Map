import { PopupContent } from "../../types/dataTypes";
import { HiExternalLink } from "react-icons/hi";
export const Popper = ({
  shopName,
  address,
  description,
  categories,
}: PopupContent) => {
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${shopName} ${address}`,
  )}`;

  return (
    <div className="w-64 font-sans">
      <h4 className="text-lg font-semibold text-primary mb-2">{shopName}</h4>
      <p className="text-accent mb-2">{description}</p>

      <div className="bg-secondary text-background px-3 py-2 mb-3 rounded-lg shadow-sm">
        <span className="block text-accent">{address}</span>
        <a
          href={googleMapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-background font-bold flex items-center text-xs gap-2 mt-3"
        >
          Open on Google Maps
          <HiExternalLink />
        </a>
      </div>

      {categories && (
        <div className="mt-3">
          <h5 className="text-sm font-semibold text-gray-600 mb-2">
            Categories:
          </h5>
          <div className="flex flex-wrap gap-2">
            {categories.split(", ").map((category, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded-lg text-background bg-primary shadow-sm"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
