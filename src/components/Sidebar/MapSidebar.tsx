import { useState, useEffect, useRef, type FormEvent } from "react";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { useAuth } from "@/context/authContext";
import { useVote } from "@/context/voteContext";
import {
  FiArrowLeft,
  FiMapPin,
  FiPhone,
  FiGlobe,
  FiUser,
  FiShare2,
  FiEdit,
} from "react-icons/fi";
import VoteButtons from "../Map/VoteButtons";
import UserAvatar from "../Avatar/UserAvatar";
import { GiSandwich } from "react-icons/gi";
import { useModal } from "@/context/modalContext";
import { HiExternalLink } from "react-icons/hi";
import { useToast } from "@/context/toastContext";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { getCommentsForShop, createComment } from "@services/commentService";
import { Comment } from "@models/Comment";

const getVoteMessage = (upvotes: number, downvotes: number) => {
  if (upvotes > downvotes) return "Highly rated by sandwich fans!";
  if (upvotes < downvotes) return "Poorly rated by sandwich fans!";
  return "Mixed reviews from sandwich fans.";
};

const formatRelativeTime = (value: string | number | Date) => {
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return "";

  const diffMs = Date.now() - time;
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 30) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

const isRecentDate = (value: string | number | Date, days = 7) => {
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return false;
  const diffDays = (Date.now() - time) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
};

const makePreview = (text: string, maxChars = 220) => {
  const normalized = text.trim();
  if (normalized.length <= maxChars)
    return { preview: normalized, truncated: false };
  return {
    preview: `${normalized.slice(0, maxChars).trimEnd()}…`,
    truncated: true,
  };
};

const MapSidebar = () => {
  const { selectedShop, position, sidebarOpen, closeSidebar } =
    useShopSidebar();
  const { openSignupModal } = useModal();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const { isAuthenticated, user, userMetadata } = useAuth();
  const { votes, addVote, getVotesForShop, submitVote, loadingVotes } =
    useVote();

 
 
  const isMember = isAuthenticated && user?.emailVerified;
  const hasFetchedVotes = useRef(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedComments, setExpandedComments] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (selectedShop?.shopId && !hasFetchedVotes.current) {
      getVotesForShop(selectedShop.shopId).catch((error) =>
        console.error("Failed to fetch votes:", error),
      );
      hasFetchedVotes.current = true;
    }
  }, [selectedShop, getVotesForShop]);

  useEffect(() => {
    const loadComments = async () => {
      if (!selectedShop?.shopId) {
        setComments([]);
        return;
      }
      setCommentsLoading(true);
      try {
        const shopComments = await getCommentsForShop(selectedShop.shopId);
        setComments(shopComments);
      } catch (error) {
        console.error("Failed to fetch comments:", error);
        addToast("Could not load comments.", "error");
      } finally {
        setCommentsLoading(false);
      }
    };

    loadComments();
  }, [selectedShop, addToast]);

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

  const handleVote = async (isUpvote: boolean) => {
    if (!isMember || !selectedShop) return;
    const isDifferentVote = userVote !== (isUpvote ? "up" : "down");
    if (isDifferentVote) {
      addVote(selectedShop.shopId, isUpvote);
      await submitVote(selectedShop.shopId, isUpvote);
    }
  };

  const toggleCommentExpanded = (id: string) => {
    setExpandedComments((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isMember) {
      openSignupModal();
      return;
    }
    if (!selectedShop?.shopId || !userMetadata) return;

    const trimmed = commentBody.trim();
    if (!trimmed) {
      addToast("Please enter a comment before submitting.", "error");
      return;
    }

    setSubmittingComment(true);
    try {
      const created = await createComment({
        shopId: selectedShop.shopId,
        userId: userMetadata.id,
        body: trimmed,
      });
      setComments((prev) => [created, ...prev]);
      setCommentBody("");
      addToast("Comment added!", "success");
    } catch (error) {
      console.error("Failed to add comment:", error);
      addToast("Could not post comment.", "error");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShareLocation = () => {
    try {
      if (!position) {
        addToast("Location data is missing.", "error");
        return;
      }

      const [longitude, latitude] = position;
      const baseUrl = window.location.origin;
      const params = new URLSearchParams();

      params.append("lat", latitude.toString());
      params.append("lng", longitude.toString());

      if (selectedShop?.shopId) {
        params.append("shopId", selectedShop.shopId.toString());
      }

      const shareableLink = `${baseUrl}?${params.toString()}`;
      navigator.clipboard.writeText(shareableLink);

      addToast("Location link copied to clipboard!", "success");
    } catch (error) {
      addToast("Failed to copy location link.", "error");
      console.error("Failed to copy location link:", error);
    }
  };

  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${selectedShop?.shopName} ${selectedShop?.address}`,
  )}`;

  const displayMessage = getVoteMessage(upvotes, downvotes);

  return (
    <aside
      className={`fixed top-[48px] left-0 z-30 w-[400px] max-w-full h-[calc(100dvh-48px)] bg-surface-light dark:bg-surface-dark text-text-base dark:text-text-inverted shadow-lg transition-transform duration-500 ease-in-out transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-end p-5">
          <button
            onClick={closeSidebar}
            className=" dark:text-text-inverted text-accent hover:text-primary transition-colors"
          >
            <FiArrowLeft size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto px-5 pb-5">
          {selectedShop ? (
            <>
              <div className="w-full h-48 bg-surface-muted dark:bg-surface-dark rounded-lg shadow-card">
                <img
                  src={selectedShop.imageUrl || "/sandwich-default.png"}
                  alt={selectedShop.shopName}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <h2 className="text-2xl font-semibold text-text-base dark:text-text-inverted">
                  {selectedShop.shopName}
                </h2>
                {isMember && (
                  <button
                    onClick={() => {
                      closeSidebar();
                      navigate(ROUTES.SHOPS.ADD, {
                        state: { initialData: selectedShop },
                      });
                    }}
                    title="Edit this shop"
                    className="text-accent hover:text-primary dark:text-brand-secondary dark:hover:text-brand-secondaryHover transition-colors"
                  >
                    <FiEdit size={20} />
                  </button>
                )}
              </div>

              {selectedShop.description && (
                <p className="mt-2 text-sm text-text-muted dark:text-text-inverted">
                  {selectedShop.description}
                </p>
              )}

              {selectedShop.locationOpen == false && (
                <span className="block bg-red-600 text-white text-xs font-bold rounded px-2 py-1 mt-2">
                  This location is permanently closed.
                </span>
              )}
              <div className="flex items-center mt-2 text-text-base dark:text-text-inverted">
                <FiMapPin size={20} className="mr-2 text-primary" />
                <span>{selectedShop.address}</span>
              </div>

              {selectedShop.categories && (
                <div className="mt-2">
                  <ul className="flex flex-wrap gap-2">
                    {selectedShop.categories
                      .split(",")
                      .map((category: string) => category.trim())
                      .map((category: string, index: number) => {
                        const isHidden = !showAllCategories && index >= 3;
                        return (
                          <li key={index} className={isHidden ? "hidden" : ""}>
                            <span className="bg-brand-secondary text-black  px-3 py-1 rounded-full text-xs font-semibold">
                              {category}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                  {selectedShop.categories.split(",").length > 3 && (
                    <button
                      onClick={() => setShowAllCategories((prev) => !prev)}
                      className="mt-2 text-xs text-primary underline"
                    >
                      {showAllCategories ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {selectedShop.phone &&
                  selectedShop.phone !== "No phone number available" && (
                    <div className="flex items-center text-text-base dark:text-text-inverted">
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
                  <div className="flex items-center text-text-base dark:text-text-inverted">
                    <FiUser size={18} className="mr-2 text-primary" />
                    <a
                      href={`mailto:${selectedShop.usersAvatarEmail}`}
                      className="hover:underline hover:text-primary"
                    >
                      {selectedShop.usersAvatarEmail}
                    </a>
                  </div>
                )}
                {selectedShop.website?.trim() &&
                  selectedShop.website.trim().toLowerCase() !==
                  "no website available" && (
                    <a
                      href={selectedShop.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-primary flex items-center text-text-base dark:text-text-inverted"
                    >
                      <FiGlobe size={18} className="mr-2 text-primary" />
                      Visit Website
                    </a>
                  )}
              </div>

              <div className="mt-6 flex items-center space-x-3">
                <button
                  onClick={handleShareLocation}
                  title="Share Shop"
                  className="flex p-2 bg-surface-muted dark:bg-surface-dark rounded-lg text-text-base dark:text-text-inverted"
                >
                  <FiShare2 size={20} />
                </button>
                <a
                  href={googleMapsSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex p-2 bg-surface-muted dark:bg-surface-dark rounded-lg text-text-base dark:text-text-inverted"
                >
                  <HiExternalLink size={20} />
                </a>
              </div>

              <div className="mt-6">
                <h5 className="text-sm font-semibold text-text-muted dark:text-text-inverted my-2">
                  Rating:
                </h5>
                <div className="bg-surface-muted dark:bg-surface-dark p-1 rounded-lg">
                  {!isMember && (
                    <span
                      onClick={openSignupModal}
                      className="cursor-pointer bg-brand-secondary text-black text-xs font-bold rounded px-2 py-1"
                    >
                      Members Only
                    </span>
                  )}
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
                  <p className="mt-4 text-center italic text-text-base dark:text-text-inverted">
                    {displayMessage}
                  </p>
                </div>
                {selectedShop.createdBy && (
                  <div className="flex items-center mt-2 text-sm text-text-muted dark:text-text-inverted">
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

              <div className="mt-6">
                <div className="flex items-center justify-between my-2">
                  <h5 className="text-sm font-semibold text-text-muted dark:text-text-inverted">
                    Comments
                  </h5>
                  <span className="text-xs text-text-muted dark:text-text-inverted">
                    {comments.length}{" "}
                    {comments.length === 1 ? "comment" : "comments"}
                  </span>
                </div>

                <div className="bg-surface-muted dark:bg-surface-dark p-3 rounded-lg space-y-3 border border-surface-dark/10 dark:border-surface-muted/20">
                  {commentsLoading ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center text-primary">
                        <GiSandwich className="animate-spin text-xl mr-2" />
                        Loading comments...
                      </div>

                      <div className="space-y-3">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="rounded-xl bg-surface-light dark:bg-surface-darker border border-surface-dark/10 dark:border-surface-muted/20 p-3 animate-pulse"
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-full bg-surface-muted dark:bg-surface-dark" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-40 rounded bg-surface-muted dark:bg-surface-dark" />
                                <div className="h-3 w-full rounded bg-surface-muted dark:bg-surface-dark" />
                                <div className="h-3 w-3/4 rounded bg-surface-muted dark:bg-surface-dark" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {comments.length === 0 ? (
                          <div className="rounded-xl bg-surface-light dark:bg-surface-darker border border-surface-dark/10 dark:border-surface-muted/20 p-3">
                            <p className="text-sm text-text-muted dark:text-text-inverted">
                              Be the first to leave a comment.
                            </p>
                          </div>
                        ) : (
                          comments.map((comment) => {
                            const body = comment.body ?? "";
                            const { preview, truncated } = makePreview(
                              body,
                              240,
                            );
                            const expanded =
                              !!expandedComments[String(comment.id)];
                            const showNew = isRecentDate(
                              comment.dateCreated,
                              7,
                            );

                            const avatarId =
                              comment.userAvatar || "default";
                            const avatarEmail =
                              comment.userEmail || "guest@example.com";
                            const displayName =
                              comment.userName || "Sandwich Fan";

                            return (
                              <div
                                key={comment.id}
                                className="rounded-xl bg-surface-light dark:bg-surface-darker border border-surface-dark/10 dark:border-surface-muted/20 shadow-sm"
                              >
                                <div className="flex items-start gap-3 p-3">
                                  {avatarId ? (
                                    <UserAvatar
                                      avatarId={avatarId}
                                      userEmail={avatarEmail}
                                      size="sm"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded-full bg-surface-muted dark:bg-surface-dark flex items-center justify-center text-primary">
                                      <FiUser size={16} />
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold text-text-base dark:text-text-inverted">
                                        {displayName}
                                      </span>

                                      {showNew && (
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-secondary text-black">
                                          New
                                        </span>
                                      )}

                                      <span className="text-xs text-text-muted dark:text-text-inverted">
                                        {formatRelativeTime(
                                          comment.dateCreated,
                                        )}
                                      </span>
                                    </div>

                                    <p className="mt-1 text-sm text-text-base dark:text-text-inverted leading-relaxed whitespace-pre-wrap break-words">
                                      {expanded || !truncated ? body : preview}
                                    </p>

                                    {truncated && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleCommentExpanded(
                                            String(comment.id),
                                          )
                                        }
                                        className="mt-2 text-xs text-primary underline"
                                      >
                                        {expanded ? "Show less" : "More"}
                                      </button>
                                    )}

                                    <div className="mt-2 flex items-center gap-2">
                                      <span
                                        className="text-[11px] text-text-muted dark:text-text-inverted"
                                        title={new Date(
                                          comment.dateCreated,
                                        ).toLocaleString()}
                                      >
                                        {new Date(
                                          comment.dateCreated,
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="pt-3 border-t border-surface-dark/10 dark:border-surface-muted/20">
                        {isMember ? (
                          <form
                            onSubmit={handleCommentSubmit}
                            className="space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted dark:text-text-inverted">
                                Share your experience
                              </span>
                              <span className="text-xs text-text-muted dark:text-text-inverted">
                                {commentBody.length}/5000
                              </span>
                            </div>

                            <textarea
                              value={commentBody}
                              onChange={(event) =>
                                setCommentBody(event.target.value)
                              }
                              placeholder="What should other sandwich fans know?"
                              maxLength={5000}
                              className="w-full rounded-xl border border-surface-dark/20 dark:border-surface-muted/20 bg-white dark:bg-surface-darker text-text-base dark:text-text-inverted p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                              rows={3}
                            />

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={
                                  submittingComment ||
                                  commentBody.trim().length === 0
                                }
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                  submittingComment ||
                                  commentBody.trim().length === 0
                                    ? "bg-surface-dark text-text-muted cursor-not-allowed"
                                    : "bg-brand-primary text-white hover:bg-brand-secondary hover:text-text-base"
                                }`}
                              >
                                {submittingComment ? "Posting..." : "Post Comment"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between bg-surface-light dark:bg-surface-darker p-3 rounded-xl border border-surface-dark/10 dark:border-surface-muted/20">
                            <div>
                              <p className="text-sm font-semibold text-text-base dark:text-text-inverted">
                                Join the community
                              </p>
                              <p className="text-xs text-text-muted dark:text-text-inverted">
                                Sign up to leave a comment and vote on shops.
                              </p>
                            </div>
                            <button
                              onClick={openSignupModal}
                              className="px-3 py-2 rounded-xl bg-brand-secondary text-black text-sm font-semibold hover:bg-brand-secondary/80"
                            >
                              Sign up
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-text-base dark:text-text-inverted text-center">
              No shop selected
            </p>
          )}
        </div>

        <div className="px-5 py-5">
          <div className="flex flex-col space-y-3">
            <button
              className="w-full px-4 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50"
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${selectedShop?.address}`,
                  "_blank",
                )
              }
            >
              Get Directions
            </button>
            <button
              className="w-full px-4 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50"
              onClick={closeSidebar}
            >
              Close Sidebar
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default MapSidebar;
