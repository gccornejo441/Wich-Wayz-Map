import { useState, useEffect, useRef, useMemo, type FormEvent } from "react";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { useAuth } from "@/context/authContext";
import { useVote } from "@/context/voteContext";
import { generateMapLinks } from "@services/mapLinkService";
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
  FiList,
  FiHeart,
  FiMoreVertical,
  FiExternalLink,
} from "react-icons/fi";
import VoteButtons from "../Map/VoteButtons";
import UserAvatar from "../Avatar/UserAvatar";
import { GiSandwich } from "react-icons/gi";
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
import { ShareLinkModal } from "@/components/Modal/ShareLinkModal";
import { buildCityStateZip, buildFullAddressForMaps } from "@utils/address";
import { useSaved } from "@context/savedContext";
import { useOverlay } from "@/context/overlayContext";
import CollectionModal from "@/components/Modal/CollectionModal";

const getVoteMessage = (upvotes: number, downvotes: number) => {
  const totalVotes = upvotes + downvotes;
  if (totalVotes === 0) return "No ratings yet.";
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
  if (normalized.length <= maxChars) return { preview: normalized, truncated: false };
  return { preview: `${normalized.slice(0, maxChars).trimEnd()}…`, truncated: true };
};

const MapSidebar = () => {
  const { selectedShop, sidebarOpen, closeSidebar } = useShopSidebar();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { openSignupModal } = useModal();

  const { isAuthenticated, user, userMetadata } = useAuth();
  const { votes, addVote, getVotesForShop, submitVote, loadingVotes } = useVote();
  const {
    savedShopIds,
    toggleSaved,
    refreshCollections,
    setSavedFilterMode,
  } = useSaved();
  const { open: openOverlay } = useOverlay();

  const isMember = isAuthenticated && user?.emailVerified;

  const canEditShop = useMemo(() => {
    if (!isAuthenticated || !userMetadata) return false;
    if (userMetadata.role === "admin") return true;
    const createdBy = selectedShop?.created_by;
    if (typeof createdBy === "number") return createdBy === userMetadata.id;
    return false;
  }, [isAuthenticated, userMetadata, selectedShop]);

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
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [showFavoriteTip, setShowFavoriteTip] = useState(false);
  const [headerHasBg, setHeaderHasBg] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setHeaderHasBg(el.scrollTop > 12);
  }, []);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target as Node)
      ) {
        setShowActionsMenu(false);
      }
    };

    if (showActionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showActionsMenu]);


  useEffect(() => {
    if (selectedShop?.shopId && !hasFetchedVotes.current) {
      getVotesForShop(selectedShop.shopId).catch((error) =>
        console.error("Failed to fetch votes:", error),
      );
      hasFetchedVotes.current = true;
    }
    setIsCollectionModalOpen(false);
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
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
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

    const confirmDelete = window.confirm("Are you sure you want to delete this comment?");
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

  const isSaved = selectedShop?.shopId ? savedShopIds.has(selectedShop.shopId) : false;

  const handleToggleSaved = async () => {
    if (!selectedShop?.shopId) return;
    if (!isMember) {
      openSignupModal();
      return;
    }
    try {
      const saved = await toggleSaved(selectedShop.shopId);
      addToast(saved ? "Saved to favorites" : "Removed from favorites", "success");
    } catch (error) {
      if (error instanceof Error && error.message === "Not authenticated") return;
      addToast("Could not update saved state", "error");
    }
  };

  const handleOpenCollections = async () => {
    if (!selectedShop?.shopId) return;
    if (!isMember) {
      openSignupModal();
      return;
    }
    closeSidebar();
    await refreshCollections();
    setIsCollectionModalOpen(true);
    openOverlay("saved");
    setSavedFilterMode("collection");
  };

  const handleShareLocation = async () => {
    try {
      if (!selectedShop) {
        addToast("No shop selected.", "error");
        return;
      }

      let latitude: number | undefined;
      let longitude: number | undefined;

      if (
        selectedShop.latitude !== undefined &&
        selectedShop.longitude !== undefined &&
        Number.isFinite(selectedShop.latitude) &&
        Number.isFinite(selectedShop.longitude)
      ) {
        latitude = selectedShop.latitude;
        longitude = selectedShop.longitude;
      } else if (selectedShop.shopId) {
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

      if (
        latitude === undefined ||
        longitude === undefined ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        addToast("This shop is missing coordinates.", "error");
        return;
      }

      const { buildDeepLink } = await import("@utils/deepLink");

      const url = buildDeepLink({
        lat: latitude,
        lng: longitude,
        z: 16,
        shopId: selectedShop.shopId,
      });

      setShareUrl(url);
      setIsShareModalOpen(true);
    } catch (error) {
      addToast("Failed to generate share link.", "error");
      console.error("Failed to generate share link:", error);
    }
  };

  const displayMessage = getVoteMessage(upvotes, downvotes);

  const sanitizePhone = (phone: string): string => phone.replace(/[\s\-()]/g, "");

  const normalizeWebsiteUrl = (url: string): string => {
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return `https://${trimmed}`;
  };

  const parsedCategories = selectedShop?.categories
    ? selectedShop.categories
        .split(",")
        .map((cat) => cat.trim())
        .filter((cat) => cat.length > 0)
    : [];

  const hiddenCategoryCount = parsedCategories.length > 3 ? parsedCategories.length - 3 : 0;

  const descriptionPreview = selectedShop?.description
    ? makePreview(selectedShop.description, 180)
    : null;

  const safeTrim = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

  const street = safeTrim(selectedShop?.address);
  const city = safeTrim(selectedShop?.city);
  const state = safeTrim(selectedShop?.state);
  const zip = safeTrim(selectedShop?.postalCode);

  const cityStateZip = buildCityStateZip(city, state, zip) || "";

  const fullAddress = buildFullAddressForMaps(street, undefined, city, state, zip);

  // Generate map URLs using centralized service with performance optimization
  const { searchUrl: googleMapsSearchUrl, directionsUrl: googleMapsDirectionsUrl } = useMemo(
    () => generateMapLinks({
      latitude: selectedShop?.latitude,
      longitude: selectedShop?.longitude,
      address: fullAddress,
      shopName: selectedShop?.shopName,
    }),
    [selectedShop?.latitude, selectedShop?.longitude, fullAddress, selectedShop?.shopName]
  );

  const heroImg = selectedShop?.imageUrl || "/sandwich-default.png";

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setHeaderHasBg(el.scrollTop > 12);
  };

  return (
    <aside
      className={`fixed top-[48px] left-0 z-30 w-full sm:w-[400px] h-[calc(100dvh-48px)] bg-surface-light dark:bg-surface-dark text-text-base dark:text-text-inverted transition-transform duration-500 ease-in-out transform ${
        sidebarOpen
          ? "translate-x-0 shadow-lg pointer-events-auto"
          : "-translate-x-full shadow-none pointer-events-none"
      }`}
    >
      <div className="flex flex-col h-full">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-grow overflow-y-auto"
        >
         <div
            className={`sticky top-0 z-20 flex items-center justify-between h-[3.2rem] px-[1.6rem] py-[0.3rem] transition-all duration-300 ${
              headerHasBg
                ? "bg-surface-light/90 dark:bg-surface-dark/80 backdrop-blur border-b border-surface-dark/10 dark:border-surface-muted/20 shadow-sm"
                : "bg-transparent border-b border-transparent shadow-none"
            }`}
          >
            <div className="top-box pc-style showBack flex items-center justify-between w-full">
              <button
                onClick={closeSidebar}
                aria-label="Close shop details"
                title="Close"
                className="lk-image close-img flex items-center justify-center w-[35px] h-[35px] rounded-lg bg-white/15 hover:bg-white/20 text-white transition-all focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              >
                <FiArrowLeft size={18} />
              </button>

              <div className="tip-box relative">
                <span className="icon-wrapper">
                  <span className="icon-slot">
                    <button
                      onClick={handleToggleSaved}
                      onMouseEnter={() => setShowFavoriteTip(true)}
                      onMouseLeave={() => setShowFavoriteTip(false)}
                      onFocus={() => setShowFavoriteTip(true)}
                      onBlur={() => setShowFavoriteTip(false)}
                      aria-label={isSaved ? "Remove from saved" : "Add to saved"}
                      title={isSaved ? "Remove from saved" : "Add to saved"}
                      className="lk-image favorite-img flex items-center justify-center w-[35px] h-[35px] rounded-lg bg-white/15 hover:bg-white/20 text-white transition-all focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    >
                      <FiHeart
                        size={18}
                        className={`transition-colors ${
                          isSaved ? "fill-brand-secondary text-brand-secondary" : ""
                        }`}
                      />
                    </button>
                  </span>
                </span>

                <div
                  className={`tip-content-wrapper absolute right-0 mt-2 ${
                    showFavoriteTip ? "block" : "hidden"
                  }`}
                  style={{ zIndex: 10 }}
                >
                  <div className="tip-arrow top-arrow absolute -top-1 right-4 w-2 h-2 rotate-45 bg-surface-light dark:bg-surface-darker border border-surface-dark/10 dark:border-surface-muted/20" />
                  <div className="content-tip max-w-[36.2rem] rounded-lg px-3 py-2 text-xs font-semibold bg-surface-light dark:bg-surface-darker text-text-base dark:text-text-inverted border border-surface-dark/10 dark:border-surface-muted/20 shadow-md">
                    {isSaved ? "Saved to favorites" : "Save to favorites"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedShop ? (
            <>
              <div className="relative -mt-[4.2rem] w-full h-56 bg-surface-muted dark:bg-surface-dark">
                <img
                  src={heroImg}
                  alt={selectedShop.shopName}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
                <div className="absolute left-0 right-0 bottom-0 px-5 pb-4">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-white leading-tight line-clamp-2 drop-shadow">
                      {selectedShop.shopName}
                    </h2>

                    <div className="relative flex-shrink-0" ref={actionsMenuRef}>
                      <button
                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                        aria-label="Shop actions"
                        title="Shop actions"
                        className="flex items-center justify-center w-[35px] h-[35px] p-2 rounded-lg bg-white/15 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                      >
                        <FiMoreVertical size={18} />
                      </button>

                      {showActionsMenu && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-surface-light dark:bg-surface-darker rounded-lg shadow-lg border border-surface-dark/10 dark:border-surface-muted/20 py-1 z-50">
                          {canEditShop && (
                            <button
                              onClick={() => {
                                setShowActionsMenu(false);
                                closeSidebar();
                                navigate(ROUTES.SHOPS.ADD, { state: { initialData: selectedShop } });
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-text-base dark:text-text-inverted hover:bg-surface-muted dark:hover:bg-surface-dark transition-colors"
                            >
                              <FiEdit size={16} className="flex-shrink-0" />
                              <span>Edit Shop</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setShowActionsMenu(false);
                              handleShareLocation();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-text-base dark:text-text-inverted hover:bg-surface-muted dark:hover:bg-surface-dark transition-colors"
                          >
                            <FiShare2 size={16} className="flex-shrink-0" />
                            <span>Share Shop</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowActionsMenu(false);
                              if (!googleMapsSearchUrl) {
                                addToast("Address is missing for this shop.", "error");
                                return;
                              }
                              window.open(googleMapsSearchUrl, "_blank");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-text-base dark:text-text-inverted hover:bg-surface-muted dark:hover:bg-surface-dark transition-colors"
                          >
                            <FiGlobe size={16} className="flex-shrink-0" />
                            <span>Open in Google Maps</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowActionsMenu(false);
                              handleOpenCollections();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-text-base dark:text-text-inverted hover:bg-surface-muted dark:hover:bg-surface-dark transition-colors"
                          >
                            <FiList size={16} className="flex-shrink-0" />
                            <span>Add to List</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-4">
                {selectedShop.description && (
                  <div className="mt-2">
                    <p
                      className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${
                        !showFullDescription && descriptionPreview?.truncated ? "line-clamp-3" : ""
                      }`}
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

                {selectedShop.locationStatus === "permanently_closed" && (
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <FiAlertCircle className="flex-shrink-0 text-red-600 dark:text-red-400" size={16} />
                    <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                      This location is permanently closed.
                    </span>
                  </div>
                )}

                {selectedShop.locationStatus === "temporarily_closed" && (
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <FiAlertCircle className="flex-shrink-0 text-yellow-600 dark:text-yellow-400" size={16} />
                    <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                      This location is temporarily closed.
                    </span>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (!googleMapsSearchUrl) {
                      addToast("Address is missing for this shop.", "error");
                      return;
                    }
                    window.open(googleMapsSearchUrl, "_blank");
                  }}
                  aria-label="View address in Google Maps"
                  className="flex items-start gap-3 mt-3 w-full text-left text-text-base dark:text-text-inverted hover:text-primary dark:hover:text-brand-secondary transition-colors p-2 -ml-2 rounded-lg hover:bg-surface-muted dark:hover:bg-surface-darker focus:outline-none focus:ring-2 focus:ring-brand-secondary group"
                >
                  <FiMapPin size={20} className="flex-shrink-0 text-primary group-hover:text-primary mt-0.5" />
                  <div className="text-sm break-words flex-1">
                    {street || cityStateZip ? (
                      <>
                        {street && <div>{street}</div>}
                        {cityStateZip && (
                          <div className="text-xs opacity-80 mt-0.5">{cityStateZip}</div>
                        )}
                      </>
                    ) : (
                      "Address unavailable"
                    )}
                  </div>
                </button>

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
                        {showAllCategories ? "Show less" : `+${hiddenCategoryCount} more`}
                      </button>
                    )}
                  </div>
                )}

                {(() => {
                  const hasPhone =
                    selectedShop.phone && selectedShop.phone !== "No phone number available";
                  const hasWebsite =
                    selectedShop.website?.trim() &&
                    selectedShop.website.trim().toLowerCase() !== "no website available";

                  const iconLinkClass =
                    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-black/5 text-text-base transition hover:border-black/20 hover:bg-black/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary dark:border-white/10 dark:bg-white/5 dark:text-text-inverted dark:hover:border-white/20 dark:hover:bg-white/10";

                  return (
                    (hasPhone || hasWebsite) && (
                      <div className="mt-4 flex items-center gap-2">
                        {hasPhone && selectedShop.phone && (
                          <a
                            href={`tel:${sanitizePhone(selectedShop.phone)}`}
                            className={iconLinkClass}
                            aria-label={`Call ${selectedShop.phone}`}
                            title={`Call ${selectedShop.phone}`}
                          >
                            <FiPhone size={18} className="text-primary" />
                          </a>
                        )}

                        {hasWebsite && selectedShop.website && (
                          <a
                            href={normalizeWebsiteUrl(selectedShop.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={iconLinkClass}
                            aria-label="Open website"
                            title="Open website"
                          >
                            <FiExternalLink size={18} className="text-primary" />
                          </a>
                        )}
                      </div>
                    )
                  );
                })()}


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
                        userEmail={selectedShop.usersAvatarEmail || "guest@example.com"}
                        size="sm"
                      />
                      <span className="ml-2">Added by: {selectedShop.createdBy}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between my-2">
                    <h5 className="text-sm font-semibold text-text-muted dark:text-text-inverted">
                      Comments
                    </h5>
                    <span className="text-xs text-text-muted dark:text-text-inverted">
                      {comments.length} {comments.length === 1 ? "comment" : "comments"}
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
                              <FiAlertCircle size={14} className="flex-shrink-0" />
                              Be the first to leave a comment.
                            </p>
                          ) : (
                            comments.map((comment) => {
                              const body = comment.body ?? "";
                              const { preview, truncated } = makePreview(body, 240);
                              const expanded = !!expandedComments[String(comment.id)];
                              const showNew = isRecentDate(comment.dateCreated, 7);

                              const avatarId = comment.userAvatar || "default";
                              const avatarEmail = comment.userEmail || "guest@example.com";
                              const displayName = comment.userName || "Sandwich Fan";

                              const isOwnComment = userMetadata?.id === comment.userId;
                              const isEditing = editingCommentId === comment.id;
                              const isDeleting = deletingCommentId === comment.id;

                              return (
                                <div
                                  key={comment.id}
                                  className="rounded-xl bg-surface-light dark:bg-surface-darker border border-surface-dark/10 dark:border-surface-muted/20 shadow-sm"
                                >
                                  <div className="flex items-start gap-3 p-3">
                                    {avatarId ? (
                                      <UserAvatar avatarId={avatarId} userEmail={avatarEmail} size="sm" />
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
                                          {formatRelativeTime(comment.dateCreated)}
                                        </span>

                                        {comment.dateModified && comment.dateModified !== comment.dateCreated && (
                                          <span className="text-[11px] text-text-muted dark:text-text-inverted italic">
                                            (edited)
                                          </span>
                                        )}
                                      </div>

                                      {isEditing ? (
                                        <div className="mt-2 space-y-2">
                                          <textarea
                                            value={editingCommentBody}
                                            onChange={(e) => setEditingCommentBody(e.target.value)}
                                            maxLength={5000}
                                            className="w-full rounded-lg border border-surface-dark/20 dark:border-surface-muted/20 bg-white dark:bg-surface-darker text-text-base dark:text-text-inverted p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                                            rows={3}
                                          />
                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateComment(comment.id)}
                                              disabled={updatingComment || editingCommentBody.trim().length === 0}
                                              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary hover:text-text-base transition-colors disabled:bg-surface-dark disabled:text-text-muted disabled:cursor-not-allowed"
                                            >
                                              <FiCheck size={14} />
                                              {updatingComment ? "Saving..." : "Save"}
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
                                            {expanded || !truncated ? body : preview}
                                          </p>

                                          {truncated && (
                                            <button
                                              type="button"
                                              onClick={() => toggleCommentExpanded(String(comment.id))}
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
                                          title={new Date(comment.dateCreated).toLocaleString()}
                                        >
                                          {new Date(comment.dateCreated).toLocaleDateString()}
                                        </span>

                                        {isOwnComment && !isEditing && (
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleEditComment(comment)}
                                              className="text-text-muted dark:text-text-inverted hover:text-primary dark:hover:text-brand-secondary transition-colors"
                                              title="Edit comment"
                                            >
                                              <FiEdit size={14} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteComment(comment.id)}
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
                          <form onSubmit={handleCommentSubmit} className="space-y-2">
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
                              onChange={(event) => setCommentBody(event.target.value)}
                              placeholder="What should other sandwich fans know?"
                              maxLength={5000}
                              className="w-full rounded-xl border border-surface-dark/20 dark:border-surface-muted/20 bg-white dark:bg-surface-darker text-text-base dark:text-text-inverted p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                              rows={3}
                            />

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={submittingComment || commentBody.trim().length === 0}
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-primary text-white hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:bg-brand-primary/40 dark:disabled:bg-brand-primary/30 disabled:cursor-not-allowed"
                              >
                                {submittingComment ? "Posting..." : "Post Comment"}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="px-5 py-6">
              <p className="text-text-base dark:text-text-inverted text-center">No shop selected</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-surface-dark/10 dark:border-surface-muted/20">
          <button
            className="w-full px-4 py-3 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-secondary hover:text-text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-50 transition-colors"
            onClick={() => {
              if (!googleMapsDirectionsUrl) {
                addToast("Cannot open directions. Address/coordinates missing.", "error");
                return;
              }
              window.open(googleMapsDirectionsUrl, "_blank");
            }}
          >
            Get Directions
          </button>
        </div>
      </div>

      {selectedShop?.shopId && (
        <CollectionModal
          isOpen={isCollectionModalOpen}
          onClose={() => setIsCollectionModalOpen(false)}
          shopId={selectedShop.shopId}
        />
      )}

      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={shareUrl}
        shopName={selectedShop?.shopName}
        onCopySuccess={() => addToast("Link copied to clipboard!", "success")}
        onCopyError={() => addToast("Failed to copy link.", "error")}
      />
    </aside>
  );
};

export default MapSidebar;
