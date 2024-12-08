import { useModal } from "../../context/modalContext";
import { PopupContent } from "../../types/dataTypes";
import { HiExternalLink, HiPencil, HiShare } from "react-icons/hi";
import UserAvatar from "../Avatar/UserAvatar";

export const Popper = ({
  shopId,
  shopName,
  address,
  description,
  categories,
  createdBy,
  usersAvatarId,
  usersAvatarEmail,
  latitude,
  longitude,
}: PopupContent) => {
  const { openUpdateShopModal } = useModal();

  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${shopName} ${address}`,
  )}`;

  const handleEditShop = () => {
    openUpdateShopModal({
      shopId,
      shopData: {
        name: shopName,
        description: description,
        categoryIds: categories
          ? categories.split(", ").map((category) => parseInt(category, 10))
          : [],
      },
    });
  };

  const handleShareLocation = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    params.append("lat", latitude.toString());
    params.append("lng", longitude.toString());
    if (shopId) params.append("shopId", shopId.toString());

    const shareableLink = `${baseUrl}?${params.toString()}`;
    navigator.clipboard.writeText(shareableLink);
    alert("Location link copied to clipboard!");
  };

  return (
    <>
      <div className="w-64 font-sans">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold text-primary">{shopName}</h4>
          <button
            disabled
            onClick={handleEditShop}
            className="text-primary hover:text-secondary focus:outline-none"
            aria-label="Edit shop"
          >
            <HiPencil className="w-4 h-4" />
          </button>
        </div>
        <p className="text-accent mb-2">{description}</p>

        <div className="bg-secondary text-background px-3 py-2 mb-3 rounded-lg shadow-sm">
          <span className="block text-accent">{address}</span>
          <a
            href={googleMapsSearchUrl}
            target="_blank"
            aria-label={`Open ${shopName} on Google Maps`}
            rel="noopener noreferrer"
            className="text-background font-bold flex items-center text-xs gap-2 mt-3"
          >
            Open on Google Maps
            <HiExternalLink />
          </a>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleShareLocation}
            className="flex items-center gap-2 text-primary hover:text-secondary focus:outline-none"
            aria-label="Share location"
          >
            <HiShare className="w-4 h-4" />
            <span>Share</span>
          </button>
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

        {createdBy && (
          <div className="flex items-center mt-2 text-sm text-gray-600">
            <UserAvatar
              avatarId={usersAvatarId || "default"}
              userEmail={usersAvatarEmail || "guest@example.com"}
              size="sm"
            />
            <span className="ml-2">Added by: {createdBy}</span>
          </div>
        )}
      </div>
    </>
  );
};
