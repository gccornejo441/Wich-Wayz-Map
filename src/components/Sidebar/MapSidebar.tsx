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
  FiTrash2,
  FiX,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";
import VoteButtons from "../Map/VoteButtons";
import UserAvatar from "../Avatar/UserAvatar";
import { GiSandwich } from "react-icons/gi";
import { HiExternalLink } from "react-icons/hi";
import { useToast } from "@/context/toastContext";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import {
  getCommentsForShop,
  createComment,
  updateComment,
  deleteComment,
} from "@services/commentService";
import { Comment } from "@models/Comment";
import { useModal } from "@/context/modalContext";

const getVoteMessage = (upvotes: number, downvotes: number) => {
  const totalVotes = upvotes + downvotes;

  // No votes yet
  if (totalVotes === 0) {
    return "No ratings yet.";
  }

  // Has votes
  if (upvotes > downvotes) return "Mostly positive";
  if (upvotes < downvotes) return "Mostly negative";
  return "Mixed reviews";
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
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { openSignupModal } = useModal();

  const { isAuthenticated, user, userMetadata } = useAuth();
  const { votes, addVote, getVotesForShop, submitVote, loadingVotes } =
    useVote();

  const isMember = isAuthenticated && user?.emailVerified;
  const hasFetchedVotes = useRef(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
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
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(
    null,
  );

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
    if (!isMember) {
      openSignupModal();
      return;
    }
    if (!selectedShop) return;
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

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentBody("");
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!userMetadata) return;

    const trimmed = editingCommentBody.trim();
    if (!trimmed) {
      addToast("Comment cannot be empty.", "error");
      return;
    }

    setUpdatingComment(true);
    try {
      const updated = await updateComment(commentId, userMetadata.id, trimmed);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c)),
      );
      setEditingCommentId(null);
      setEditingCommentBody("");
      addToast("Comment updated!", "success");
    } catch (error) {
      console.error("Failed to update comment:", error);
      addToast("Could not update comment.", "error");
    } finally {
      setUpdatingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!userMetadata) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this comment?",
    );
    if (!confirmDelete) return;

    setDeletingCommentId(commentId);
    try {
      await deleteComment(commentId, userMetadata.id);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      addToast("Comment deleted!", "success");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      addToast("Could not delete comment.", "error");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleShareLocation = async () => {
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      // Primary: Use selectedShop coordinates
      if (
        selectedShop?.latitude !== undefined &&
        selectedShop?.longitude !== undefined &&
        Number.isFinite(selectedShop.latitude) &&
        Number.isFinite(selectedShop.longitude)
      ) {
        latitude = selectedShop.latitude;
        longitude = selectedShop.longitude;
      }
      // Fallback: Use position from context
      else if (position) {
        const [lng, lat] = position;
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          longitude = lng;
          latitude = lat;
        }
      }
      // Last-chance: Try to fetch shop by ID
      else if (selectedShop?.shopId) {
        try {
          const { fetchShopById } = await import("@services/shopService");
          const shopData = await fetchShopById(selectedShop.shopId);
          if (
            shopData.latitude !== undefined &&
            shopData.longitude !== undefined &&
            Number.isFinite(shopData.latitude) &&
            Number.isFinite(shopData.longitude)
          ) {
            latitude = shopData.latitude;
            longitude = shopData.longitude;
          }
        } catch (error) {
          console.error("Failed to fetch shop coordinates:", error);
        }
      }

      // Validate we have valid coordinates
      if (
        latitude === undefined ||
        longitude === undefined ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        addToast("Location data is missing.", "error");
        return;
      }

      const baseUrl = window.location.origin;
      const params = new URLSearchParams();

      params.append("lat", latitude.toString());
      params.append("lng", longitude.toString());

      if (selectedShop?.shopId) {
        params.append("shopId", selectedShop.shopId.toString());
      }

      const shareableLink = `${baseUrl}?${params.toString()}`;
      await navigator.clipboard.writeText(shareableLink);

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

  // Helper: Sanitize phone number for tel: link
  const sanitizePhone = (phone: string): string => {
    return phone.replace(/[\s\-()]/g, "");
  };

  // Helper: Normalize website URL
  const normalizeWebsiteUrl = (url: string): string => {
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  // Parse categories safely
  const parsedCategories = selectedShop?.categories
    ? selectedShop.categories
      .split(",")
      .map((cat) => cat.trim())
      .filter((cat) => cat.length > 0)
    : [];

  const hiddenCategoryCount =
    parsedCategories.length > 3 ? parsedCategories.length - 3 : 0;

  // Check if description needs truncation
  const descriptionPreview = selectedShop?.description
    ? makePreview(selectedShop.description, 180)
    : null;

  return (
    <aside
      className={`fixed top-[48px] left-0 z-30 w-[400px] max-w-full h-[calc(100dvh-48px)] bg-surface-light dark:bg-surface-dark text-text-base dark:text-text-inverted shadow-lg transition-transform duration-500 ease-in-out transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-end p-3">
          <button
            onClick={closeSidebar}
            aria-label="Close shop details"
            title="Close shop details"
            className="dark:text-text-inverted text-accent hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-muted dark:hover:bg-surface-darker focus:outline-none focus:ring-2 focus:ring-brand-secondary"
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

              {/* Header with shop name and edit button */}
              <div className="flex items-start justify-between gap-3 mt-4">
                <h2 className="text-2xl font-semibold text-text-base dark:text-text-inverted line-clamp-2 flex-1">
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
                    aria-label="Edit shop"
                    title="Edit this shop"
                    className="flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] p-2 text-accent hover:text-primary dark:text-brand-secondary dark:hover:text-brand-secondaryHover bg-surface-muted dark:bg-surface-dark rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  >
                    <FiEdit size={20} />
                  </button>
                )}
              </div>

              {/* Description with read more/less */}
              {selectedShop.description && (
                <div className="mt-2">
                  <p
                    className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${!showFullDescription && descriptionPreview?.truncated ? "line-clamp-3" : ""}`}
                  >
                    {showFullDescription || !descriptionPreview?.truncated
                      ? selectedShop.description
                      : descriptionPreview.preview}
                  </p>
                  {descriptionPreview?.truncated && (
                    <button
                      onClick={() => setShowFullDescription((prev) => !prev)}
                      className="mt-1 text-xs text-primary hover:text-primary/80 underline focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-1 rounded"
                    >
                      {showFullDescription ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              )}

              {/* Permanently closed banner */}
              {selectedShop.locationOpen == false && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <FiAlertCircle
                    className="flex-shrink-0 text-red-600 dark:text-red-400"
                    size={16}
                  />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                    This location is permanently closed.
                  </span>
                </div>
              )}

              {/* Address row - clickable */}
              <button
                onClick={() => window.open(googleMapsSearchUrl, "_blank")}
                aria-label="View address in Google Maps"
                className="flex items-start gap-2 mt-3 w-full text-left text-text-base dark:text-text-inverted hover:text-primary dark:hover:text-brand-secondary transition-colors p-2 -ml-2 rounded-lg hover:bg-surface-muted dark:hover:bg-surface-darker focus:outline-none focus:ring-2 focus:ring-brand-secondary group"
              >
                <FiMapPin
                  size={20}
                  className="flex-shrink-0 text-primary group-hover:text-primary mt-0.5"
                />
                <span className="text-sm break-words">
                  {selectedShop.address}
                </span>
              </button>

              {/* Categories with improved labels */}
              {parsedCategories.length > 0 && (
                <div className="mt-3">
                  <ul className="flex flex-wrap gap-2">
                    {parsedCategories.map((category, index) => {
                      const isHidden = !showAllCategories && index >= 3;
                      return (
                        <li key={category} className={isHidden ? "hidden" : ""}>
                          <span className="bg-brand-secondary text-black px-3 py-1 rounded-full text-xs font-semibold">
                            {category}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {hiddenCategoryCount > 0 && (
                    <button
                      onClick={() => setShowAllCategories((prev) => !prev)}
                      className="mt-2 text-xs text-primary hover:text-primary/80 underline focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-1 rounded"
                    >
                      {showAllCategories
                        ? "Show less"
                        : `+${hiddenCategoryCount} more`}
                    </button>
                  )}
                </div>
              )}

              {/* Phone and Website */}
              <div className="mt-4 space-y-3">
                {selectedShop.phone &&
                  selectedShop.phone !== "No phone number available" && (
                    <div className="flex items-center text-text-base dark:text-text-inverted">
                      <FiPhone
                        size={18}
                        className="mr-2 text-primary flex-shrink-0"
                      />
                      <a
                        href={`tel:${sanitizePhone(selectedShop.phone)}`}
                        className="hover:underline hover:text-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary rounded"
                      >
                        {selectedShop.phone}
                      </a>
                    </div>
                  )}
                {selectedShop.website?.trim() &&
                  selectedShop.website.trim().toLowerCase() !==
                  "no website available" && (
                    <a
                      href={normalizeWebsiteUrl(selectedShop.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-primary flex items-center text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-secondary rounded"
                    >
                      <FiGlobe
                        size={18}
                        className="mr-2 text-primary flex-shrink-0"
                      />
                      <span className="break-words">Visit Website</span>
                    </a>
                  )}
              </div>

              {/* Action buttons: Share and Open in Maps */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleShareLocation}
                  aria-label="Share shop"
                  title="Share shop"
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] p-2 bg-surface-muted dark:bg-surface-dark rounded-lg text-text-base dark:text-text-inverted hover:bg-surface-dark dark:hover:bg-surface-darker transition-colors focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                >
                  <FiShare2 size={20} />
                </button>
                <a
                  href={googleMapsSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in Google Maps"
                  title="Open in Google Maps"
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] p-2 bg-surface-muted dark:bg-surface-dark rounded-lg text-text-base dark:text-text-inverted hover:bg-surface-dark dark:hover:bg-surface-darker transition-colors focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                >
                  <HiExternalLink size={20} />
                </a>
              </div>

              <div className="mt-6">
                <h5 className="text-sm font-semibold text-text-muted dark:text-text-inverted my-2">
                  Rating
                </h5>
                <div className="bg-surface-muted dark:bg-surface-dark p-4 rounded-lg">
                  {loadingVotes ? (
                    <div className="flex items-center justify-center text-primary py-4">
                      <GiSandwich className="animate-spin text-xl mr-2" />
                      Loading votes...
                    </div>
                  ) : (
                    <>
                      <VoteButtons
                        isMember={isMember}
                        userVote={userVote}
                        handleVote={handleVote}
                        upvotes={upvotes}
                        downvotes={downvotes}
                      />
                      {displayMessage && (
                        <p className="mt-4 text-center text-sm text-text-base dark:text-text-inverted">
                          {displayMessage}
                        </p>
                      )}
                    </>
                  )}
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
                          <p className="text-xs text-text-muted dark:text-text-inverted/70 flex items-center gap-1.5 py-1">
                            <FiAlertCircle
                              size={14}
                              className="flex-shrink-0"
                            />
                            Be the first to leave a comment.
                          </p>
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

                            const avatarId = comment.userAvatar || "default";
                            const avatarEmail =
                              comment.userEmail || "guest@example.com";
                            const displayName =
                              comment.userName || "Sandwich Fan";

                            const isOwnComment =
                              userMetadata?.id === comment.userId;
                            const isEditing = editingCommentId === comment.id;
                            const isDeleting = deletingCommentId === comment.id;

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

                                      {comment.dateModified &&
                                        comment.dateModified !==
                                        comment.dateCreated && (
                                          <span className="text-[11px] text-text-muted dark:text-text-inverted italic">
                                            (edited)
                                          </span>
                                        )}
                                    </div>

                                    {isEditing ? (
                                      <div className="mt-2 space-y-2">
                                        <textarea
                                          value={editingCommentBody}
                                          onChange={(e) =>
                                            setEditingCommentBody(
                                              e.target.value,
                                            )
                                          }
                                          maxLength={5000}
                                          className="w-full rounded-lg border border-surface-dark/20 dark:border-surface-muted/20 bg-white dark:bg-surface-darker text-text-base dark:text-text-inverted p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                                          rows={3}
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateComment(comment.id)
                                            }
                                            disabled={
                                              updatingComment ||
                                              editingCommentBody.trim()
                                                .length === 0
                                            }
                                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary hover:text-text-base transition-colors disabled:bg-surface-dark disabled:text-text-muted disabled:cursor-not-allowed"
                                          >
                                            <FiCheck size={14} />
                                            {updatingComment
                                              ? "Saving..."
                                              : "Save"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            disabled={updatingComment}
                                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-muted dark:bg-surface-dark text-text-base dark:text-text-inverted text-sm font-semibold hover:bg-surface-dark dark:hover:bg-surface-darker transition-colors"
                                          >
                                            <FiX size={14} />
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p className="mt-1 text-sm text-text-base dark:text-text-inverted leading-relaxed whitespace-pre-wrap break-words">
                                          {expanded || !truncated
                                            ? body
                                            : preview}
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
                                      </>
                                    )}

                                    <div className="mt-2 flex items-center gap-3">
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

                                      {isOwnComment && !isEditing && (
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleEditComment(comment)
                                            }
                                            className="text-text-muted dark:text-text-inverted hover:text-primary dark:hover:text-brand-secondary transition-colors"
                                            title="Edit comment"
                                          >
                                            <FiEdit size={14} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteComment(comment.id)
                                            }
                                            disabled={isDeleting}
                                            className="text-text-muted dark:text-text-inverted hover:text-red-600 dark:hover:text-red-500 transition-colors disabled:opacity-50"
                                            title="Delete comment"
                                          >
                                            <FiTrash2 size={14} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="pt-3 border-t border-surface-dark/10 dark:border-surface-muted/20">
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
                              className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-primary text-white hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:bg-brand-primary/40 dark:disabled:bg-brand-primary/30 disabled:cursor-not-allowed"
                            >
                              {submittingComment
                                ? "Posting..."
                                : "Post Comment"}
                            </button>
                          </div>
                        </form>
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

        <div className="px-5 py-4 border-t border-surface-dark/10 dark:border-surface-muted/20">
          <button
            className="w-full px-4 py-3 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50 transition-colors"
            onClick={() =>
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${selectedShop?.address}`,
                "_blank",
              )
            }
          >
            Get Directions
          </button>
        </div>
      </div>
    </aside>
  );
};

export default MapSidebar;
