import { useModal } from "../../context/modalContext";
import { PopupContent } from "../../types/dataTypes";
import { HiExternalLink, HiPencil, HiShare } from "react-icons/hi";
import UserAvatar from "../Avatar/UserAvatar";
import { useToast } from "../../context/toastContext";
import { getCurrentUser } from "../../services/security";
import { useVote } from "../../context/voteContext";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/authContext";
import { GiSandwich } from "react-icons/gi";

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
  const { openUpdateShopModal, openSignupModal } = useModal();
  const { addToast } = useToast();
  const { votes, addVote, getVotesForShop, submitVote, loadingVotes } =
    useVote();
  const hasFetchedVotes = useRef(false);
  const { logout } = useAuth();
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const checkMembership = async () => {
      const currentUser = await getCurrentUser(logout);
      setIsMember(currentUser?.membershipStatus === "member");
    };

    checkMembership();
  }, [logout]);

  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${shopName} ${address}`,
  )}`;

  useEffect(() => {
    if (shopId && !hasFetchedVotes.current) {
      getVotesForShop(shopId).catch((error) => {
        console.error("Failed to fetch votes:", error);
      });
      hasFetchedVotes.current = true;
    }
  }, [shopId, getVotesForShop]);

  useEffect(() => {
    if (votes && shopId in votes) {
      const currentVotes = votes[shopId] || {
        upvotes: 0,
        downvotes: 0,
        userVote: null,
      };
      setUpvotes(currentVotes.upvotes);
      setDownvotes(currentVotes.downvotes);
      setUserVote(currentVotes.userVote || null);
    }
  }, [votes, shopId]);

  const handleVote = async (isUpvote: boolean) => {
    if (isMember) {
      const isDifferentVote = userVote !== (isUpvote ? "up" : "down");
      if (isDifferentVote) {
        addVote(shopId, isUpvote);
        await submitVote(shopId, isUpvote);
      }
    }
  };

  const displayMessage =
    upvotes > downvotes
      ? "Highly rated by sandwich fans!"
      : upvotes < downvotes
        ? "Poorly rated by sandwich fans!"
        : "Mixed reviews from sandwich fans.";

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
    try {
      const baseUrl = window.location.origin;
      const params = new URLSearchParams();
      params.append("lat", latitude.toString());
      params.append("lng", longitude.toString());
      if (shopId) params.append("shopId", shopId.toString());

      const shareableLink = `${baseUrl}?${params.toString()}`;
      navigator.clipboard.writeText(shareableLink);

      addToast("Location link copied to clipboard!", "success");
    } catch (error) {
      addToast("Failed to copy location link.", "error");
      console.error("Failed to copy location link:", error);
    }
  };

  return (
    <>
      <div className="font-sans">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold text-primary">{shopName}</h4>
          <div className="flex gap-2">
            <button
              onClick={handleShareLocation}
              title="Share location"
              className="flex items-center gap-2 text-primary hover:text-secondary focus:outline-none"
              aria-label="Share location"
            >
              <HiShare className="w-4 h-4" />
            </button>
            <button
              disabled
              title="Edit shop"
              onClick={handleEditShop}
              className="text-primary cursor-not-allowed hover:text-secondary focus:outline-none"
              aria-label="Edit shop"
            >
              <HiPencil className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="">
            <h5 className="text-sm font-semibold text-gray-600">
              Description:
            </h5>
            <span className="text-accent">{description}</span>

            <div className="bg-secondary text-background px-3 py-2 my-3 rounded-lg shadow-sm">
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
            <div className="flex items-center gap-2 mt-3"></div>
            {categories && (
              <div>
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

          <div className="h-full justify-between">
            <h5 className="text-sm font-semibold text-gray-600 my-2">
              Rating:
            </h5>
            <div className="bg-gray-100 p-1 rounded-lg">
              <div className="flex justify-between items-center">
                {!isMember && (
                  <span
                    onClick={openSignupModal}
                    className="cursor-pointer bg-secondary text-gray-800 text-xs font-bold rounded px-2 py-1"
                  >
                    Members Only
                  </span>
                )}
              </div>
              {loadingVotes ? (
                <div className="flex items-center justify-center text-primary mt-4">
                  <GiSandwich className="animate-spin text-xl mr-2" />
                  Loading votes...
                </div>
              ) : (
                <div className="flex justify-around mt-4">
                  <button
                    onClick={() => handleVote(true)}
                    title={isMember ? "I like this!" : "Only members can vote"}
                    className={`px-3 py-1 text-white rounded-lg hover:bg-secondary-dark focus:outline-none ${
                      isMember
                        ? "bg-primary"
                        : "bg-primary/50 cursor-not-allowed"
                    }`}
                    disabled={!isMember || userVote === "up"}
                  >
                    👍 {upvotes}
                  </button>
                  <button
                    onClick={() => handleVote(false)}
                    title={
                      isMember ? "I don't like this." : "Only members can vote"
                    }
                    className={`px-3 py-1 text-white rounded-lg hover:bg-secondary-dark focus:outline-none ${
                      isMember
                        ? "bg-primary"
                        : "bg-primary/50 cursor-not-allowed"
                    }`}
                    disabled={!isMember || userVote === "down"}
                  >
                    👎 {downvotes}
                  </button>
                </div>
              )}
              <p className="mt-4 text-center italic text-dark">
                {displayMessage}
              </p>
            </div>

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
        </div>
      </div>
    </>
  );
};
