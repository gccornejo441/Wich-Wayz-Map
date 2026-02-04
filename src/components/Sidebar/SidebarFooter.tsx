import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useToast } from "../../context/toastContext";
import ThemeToggle from "../Utilites/ThemeToggle";
import { useAuth } from "@context/authContext";
import UserAvatar from "@components/Avatar/UserAvatar";
import { useState, useRef, useEffect } from "react";
import { HiUser, HiLogout, HiUserAdd, HiKey } from "react-icons/hi";
import { createPaymentLink } from "../../services/stripe";
import { useModal } from "../../context/modalContext";

const CONTACT_EMAIL = "wich.wayz.map@gmail.com";

const linkBaseClasses =
  "text-xs text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-sm";

const SidebarFooter = () => {
  const { addToast } = useToast();
  const { isAuthenticated, user, userMetadata, logout } = useAuth();
  const navigate = useNavigate();
  const { openLoginModal, openSignupModal } = useModal();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleContactUsClick = async () => {
    if (!navigator.clipboard?.writeText) {
      addToast(`Email: ${CONTACT_EMAIL}`, "info");
      return;
    }

    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      addToast("Email copied to clipboard!", "success");
    } catch {
      addToast("Failed to copy email. Email: " + CONTACT_EMAIL, "error");
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    addToast("You have been logged out successfully.", "success");
  };

  const handleProfile = () => {
    navigate(ROUTES.ACCOUNT.PROFILE);
    setShowDropdown(false);
  };

  const handleBecomeMember = async () => {
    setShowDropdown(false);
    try {
      const paymentLink = await createPaymentLink(
        userMetadata?.id,
        userMetadata?.email,
      );
      window.location.href = paymentLink;
    } catch (error) {
      addToast("Failed to create payment link. Please try again.", "error");
      console.error("Error creating payment link:", error);
    }
  };

  const handleAdminSettings = () => {
    navigate(ROUTES.ACCOUNT.ADMIN_SETTINGS);
    setShowDropdown(false);
  };

  return (
    <div className="mt-auto  py-3 text-xs text-white/70">
      {/* User Avatar Section - ChatGPT Style */}
      <div className="relative mb-3" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 p-2 w-full rounded-lg hover:bg-white/10 transition-colors group"
        >
          <div className="shrink-0">
            <UserAvatar
              avatarId={userMetadata?.avatar || "default"}
              userEmail={userMetadata?.email || "guest@example.com"}
              size="sm"
            />
          </div>
          <div className="flex-1 min-w-0 text-left">
            {isAuthenticated && user && userMetadata ? (
              <>
                <p className="text-sm font-medium text-white truncate group-hover:text-white/90">
                  {userMetadata.firstName && userMetadata.lastName
                    ? `${userMetadata.firstName} ${userMetadata.lastName}`
                    : userMetadata.username || user.email?.split("@")[0] || "User"}
                </p>
                {!user.emailVerified && (
                  <p className="text-xs text-white/50">Email not verified</p>
                )}
              </>
            ) : (
              <p className="text-sm font-medium text-white truncate group-hover:text-white/90">
                Guest
              </p>
            )}
          </div>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-surface-darker rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            {isAuthenticated && user && userMetadata ? (
              <>
                {/* Authenticated User Menu */}
                <button
                  onClick={handleProfile}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <HiUser className="w-4 h-4" />
                  Profile
                </button>

                {userMetadata?.verified &&
                  userMetadata?.membershipStatus !== "member" && (
                    <button
                      onClick={handleBecomeMember}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <HiUserAdd className="w-4 h-4" />
                      Become a Club Member
                    </button>
                  )}

                {userMetadata?.role === "admin" && (
                  <button
                    onClick={handleAdminSettings}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <HiKey className="w-4 h-4" />
                    Admin Settings
                  </button>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <HiLogout className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                {/* Guest User Menu */}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    addToast("Sign in to continue.", "info");
                    openLoginModal();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <HiUser className="w-4 h-4" />
                  Sign In
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    openSignupModal();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <HiUserAdd className="w-4 h-4" />
                  Register
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p>© 2026 Wich Wayz?</p>
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>

      <nav
        aria-label="Sidebar footer links"
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1"
      >
        <a
          href="https://en.wikipedia.org/wiki/Sandwich"
          target="_blank"
          rel="noopener noreferrer"
          className={linkBaseClasses}
        >
          About
        </a>

        <button
          type="button"
          onClick={handleContactUsClick}
          className={linkBaseClasses}
          aria-label="Copy contact email to clipboard"
        >
          Contact Us
        </button>

        <Link to={ROUTES.LEGAL.PRIVACY_POLICY} className={linkBaseClasses}>
          Privacy Policy
        </Link>

        <Link to={ROUTES.LEGAL.TERMS_OF_SERVICE} className={linkBaseClasses}>
          Terms of Service
        </Link>
      </nav>
    </div>
  );
};

export default SidebarFooter;
