import { useModal } from "../../context/modalContext";
import { HiExternalLink, HiPencil, HiShare } from "react-icons/hi";
import UserAvatar from "../Avatar/UserAvatar";
import { useToast } from "../../context/toastContext";
import { getCurrentUser } from "../../services/security";
import { useVote } from "../../context/voteContext";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/authContext";
import { GiSandwich } from "react-icons/gi";
import VoteButtons from "./VoteButtons";
import { ShopMarker } from "./MapBox";


const checkMembership = async (logout: () => Promise<void>) => {
  const currentUser = await getCurrentUser(logout);
  return currentUser?.membershipStatus === "member";
};

const getVoteMessage = (upvotes: number, downvotes: number) => {
  if (upvotes > downvotes) return "Highly rated by sandwich fans!";
  if (upvotes < downvotes) return "Poorly rated by sandwich fans!";
  return "Mixed reviews from sandwich fans.";
};

export const Popper = ({ position, popupContent }: ShopMarker) => {
  const latitude = position[1]; 
  const longitude = position[0];

  const {
    shopId,
    shopName,
    address,
    description,
    createdBy,
    categories,
    usersAvatarId,
    usersAvatarEmail,
    locationOpen,
  } = popupContent;

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
    const fetchMembership = async () => {
      const isUserMember = await checkMembership(logout);
      setIsMember(isUserMember);
    };

    fetchMembership();
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

  const displayMessage = getVoteMessage(upvotes, downvotes);

  return (
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
        <div>
          <h5 className="text-sm font-semibold text-gray-600">Description:</h5>
          <span className="text-accent">{description}</span>

          <div className="bg-secondary text-background px-3 py-2 my-3 rounded-lg shadow-sm">
            <span className="block text-accent">{address}</span>
            {locationOpen && (
              <span className="block bg-red-600 text-white text-xs font-bold rounded px-2 py-1 mt-2">
                This location is permanently closed.
              </span>
            )}
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
          {categories && (
            <div>
              <h5 className="text-sm font-semibold text-gray-600 mb-2">
                Categories:
              </h5>
              <div className="flex flex-wrap gap-2">
                {categories.split(", ").map((category: string, index: number) => (
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
          <h5 className="text-sm font-semibold text-gray-600 my-2">Rating:</h5>
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
              <VoteButtons
                isMember={isMember}
                userVote={userVote}
                handleVote={handleVote}
                upvotes={upvotes}
                downvotes={downvotes}
              />
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
  );
};
