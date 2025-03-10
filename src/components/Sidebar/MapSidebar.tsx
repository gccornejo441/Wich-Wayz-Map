import { useState, useEffect, useRef } from "react";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { useAuth } from "@/context/authContext";
import { useVote } from "@/context/voteContext";
import {
  FiX,
  FiMapPin,
  FiClock,
  FiPhone,
  FiGlobe,
  FiUser,
  FiShare2,
} from "react-icons/fi";
import VoteButtons from "../Map/VoteButtons";
import UserAvatar from "../Avatar/UserAvatar";
import { GiSandwich } from "react-icons/gi";
import { useModal } from "@/context/modalContext";

const getVoteMessage = (upvotes: number, downvotes: number) => {
  if (upvotes > downvotes) return "Highly rated by sandwich fans!";
  if (upvotes < downvotes) return "Poorly rated by sandwich fans!";
  return "Mixed reviews from sandwich fans.";
};

const Sidebar = () => {
  const { selectedShop, sidebarOpen, closeSidebar } = useShopSidebar();
  const { openSignupModal } = useModal();

  const { isAuthenticated, user } = useAuth();
  // Removed loadingVotes
  const { votes, addVote, getVotesForShop, submitVote, loadingVotes } =
    useVote();
  const isMember = isAuthenticated && user?.emailVerified;
  const hasFetchedVotes = useRef(false);

  // Local vote state
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);

  // Fetch votes when shop changes
  useEffect(() => {
    if (selectedShop?.shopId && !hasFetchedVotes.current) {
      getVotesForShop(selectedShop.shopId).catch((error) =>
        console.error("Failed to fetch votes:", error),
      );
      hasFetchedVotes.current = true;
    }
  }, [selectedShop, getVotesForShop]);

  // Sync local vote state with fetched votes
  useEffect(() => {
    if (selectedShop && votes && selectedShop.shopId in votes) {
      const currentVotes = votes[selectedShop.shopId] || {
        upvotes: 0,
        downvotes: 0,
        userVote: null,
      };
      setUpvotes(currentVotes.upvotes);
      setDownvotes(currentVotes.downvotes);
      setUserVote(currentVotes.userVote || null);
    }
  }, [votes, selectedShop]);

  // Handle voting
  const handleVote = async (isUpvote: boolean) => {
    if (!isMember || !selectedShop) return;
    const isDifferentVote = userVote !== (isUpvote ? "up" : "down");
    if (isDifferentVote) {
      addVote(selectedShop.shopId, isUpvote);
      await submitVote(selectedShop.shopId, isUpvote);
    }
  };

  // Handle share link copying
  const handleShare = () => {
    if (!isMember) return;
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Shop link copied to clipboard!");
    });
  };

  const displayMessage = getVoteMessage(upvotes, downvotes);

  console.log("Upvote, downvote", upvotes);
  return (
    <aside
      className={`fixed top-[48px] left-0 z-30 w-[400px] h-screen bg-background shadow-lg transition-transform overflow-y-auto duration-500 ease-in-out transform ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Close Button */}
      <button
        onClick={closeSidebar}
        className="absolute top-3 right-3 text-accent hover:text-primary transition-colors"
      >
        <FiX size={24} />
      </button>

      <div className="flex flex-col h-full overflow-y-auto p-5">
        {selectedShop ? (
          <>
            {/* Shop Image */}
            <div className="w-full h-48 bg-lightGray rounded-lg shadow-card">
              <img
                src={selectedShop.imageUrl || "/sandwich-default.png"}
                alt={selectedShop.shopName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Shop Name */}
            <h2 className="text-2xl font-semibold mt-4 text-accent">
              {selectedShop.shopName}
            </h2>

            {/* Address */}
            <div className="flex items-center mt-2 text-dark">
              <FiMapPin size={28} className="mr-2 text-primary" />
              <span>{selectedShop.address}</span>
            </div>

            {/* Categories */}
            {selectedShop.categories && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedShop.categories.split(",").map((category, index) => (
                  <span
                    key={index}
                    className="bg-secondary text-dark px-3 py-1 rounded-full text-xs font-semibold"
                  >
                    {category.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Opening Hours */}
            {selectedShop.locationOpen !== undefined && (
              <div className="flex items-center mt-3">
                <FiClock
                  size={18}
                  className={`mr-2 ${selectedShop.locationOpen ? "text-secondary" : "text-primary"}`}
                />
                <span
                  className={`font-medium ${selectedShop.locationOpen ? "text-secondary" : "text-primary"}`}
                >
                  {selectedShop.locationOpen ? "Open Now" : "Closed"}
                </span>
              </div>
            )}

            {/* Contact Information */}
            <div className="mt-4 space-y-3">
              {selectedShop.phone && (
                <div className="flex items-center text-dark">
                  <FiPhone size={18} className="mr-2 text-primary" />
                  <a
                    href={`tel:${selectedShop.phone}`}
                    className="hover:underline hover:text-primary"
                  >
                    {selectedShop.phone}
                  </a>
                </div>
              )}
              {selectedShop.usersAvatarEmail && (
                <div className="flex items-center text-dark">
                  <FiUser size={18} className="mr-2 text-primary" />
                  <a
                    href={`mailto:${selectedShop.usersAvatarEmail}`}
                    className="hover:underline hover:text-primary"
                  >
                    {selectedShop.usersAvatarEmail}
                  </a>
                </div>
              )}
              {selectedShop.website && (
                <div className="flex items-center text-dark">
                  <FiGlobe size={18} className="mr-2 text-primary" />
                  <a
                    href={selectedShop.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-primary"
                  >
                    Visit Website
                  </a>
                </div>
              )}
            </div>

            {/* Share Section */}
            <div className="mt-6 flex items-center justify-between">
              {/* Share Button */}
              <button
                onClick={handleShare}
                title="Share Shop"
                className="p-2 bg-secondary rounded-lg text-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiShare2 size={20} />
              </button>
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

              {selectedShop.createdBy && (
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <UserAvatar
                    avatarId={selectedShop.usersAvatarId || "default"}
                    userEmail={
                      selectedShop.usersAvatarEmail || "guest@example.com"
                    }
                    size="sm"
                  />
                  <span className="ml-2">
                    Added by: {selectedShop.createdBy}
                  </span>
                </div>
              )}
            </div>
            {/* Action Buttons */}
            <div className="mt-6 flex flex-col space-y-3">
              <button
                className="w-full bg-primary hover:bg-primaryBorder text-white py-2 rounded-lg text-center shadow-md transition-colors"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${selectedShop.address}`,
                    "_blank",
                  )
                }
              >
                Get Directions
              </button>
              <button
                className="w-full bg-lightGray hover:bg-gray-200 text-dark py-2 rounded-lg text-center shadow-md transition-colors"
                onClick={closeSidebar}
              >
                Close Sidebar
              </button>
            </div>
          </>
        ) : (
          <p className="text-dark text-center">No shop selected</p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
