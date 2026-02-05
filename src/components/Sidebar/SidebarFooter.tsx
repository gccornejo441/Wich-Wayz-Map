import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useToast } from "../../context/toastContext";
import { useAuth } from "@context/authContext";
import UserAvatar from "@components/Avatar/UserAvatar";
import { useState, useRef, useEffect } from "react";
import {
  HiUser,
  HiLogout,
  HiUserAdd,
  HiKey,
  HiChevronRight,
  HiQuestionMarkCircle,
  HiInformationCircle,
  HiMail,
  HiShieldCheck,
  HiDocumentText,
} from "react-icons/hi";
import { FaMoon, FaSun } from "react-icons/fa";
import { createPaymentLink } from "../../services/stripe";
import { useModal } from "../../context/modalContext";
import { useTheme } from "@/hooks/useTheme";

const CONTACT_EMAIL = "wich.wayz.map@gmail.com";

const SidebarFooter = () => {
  const { addToast } = useToast();
  const { isAuthenticated, user, userMetadata, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { openLoginModal, openSignupModal } = useModal();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHelpSubmenu, setShowHelpSubmenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const menuItemBase =
    "w-full px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors";
  const menuItemRow = `${menuItemBase} flex items-center justify-between`;
  const menuItemLeft = "flex items-center gap-3";
  const menuDivider = "border-t border-gray-200 dark:border-gray-700 my-1";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setShowHelpSubmenu(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const closeAllMenus = () => {
    setShowDropdown(false);
    setShowHelpSubmenu(false);
  };

  const handleContactUsClick = async () => {
    if (!navigator.clipboard?.writeText) {
      addToast(`Email: ${CONTACT_EMAIL}`, "info");
      return;
    }

    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      addToast("Email copied to clipboard!", "success");
      closeAllMenus();
    } catch {
      addToast("Failed to copy email. Email: " + CONTACT_EMAIL, "error");
    }
  };

  const handleLogout = async () => {
    await logout();
    closeAllMenus();
    addToast("You have been logged out successfully.", "success");
  };

  const handleProfile = () => {
    navigate(ROUTES.ACCOUNT.PROFILE);
    closeAllMenus();
  };

  const handleBecomeMember = async () => {
    closeAllMenus();
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
    closeAllMenus();
  };

  const ThemeIcon = theme === "dark" ? FaMoon : FaSun;
  const themeLabel = theme === "dark" ? "Dark Mode" : "Light Mode";

  return (
    <div className="mt-auto text-xs text-white/70">
      <div className="relative mb-3" ref={dropdownRef}>
        <button
          onClick={() => {
            setShowDropdown((v) => !v);
            setShowHelpSubmenu(false);
          }}
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
                    : userMetadata.username ||
                      user.email?.split("@")[0] ||
                      "User"}
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

        {showDropdown && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-surface-darker rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            {isAuthenticated && user && userMetadata ? (
              <>
                <button onClick={handleProfile} className={menuItemRow}>
                  <span className={menuItemLeft}>
                    <HiUser className="w-4 h-4" />
                    Profile
                  </span>
                  <span />
                </button>

                {userMetadata?.verified &&
                  userMetadata?.membershipStatus !== "member" && (
                    <button
                      onClick={handleBecomeMember}
                      className={menuItemRow}
                    >
                      <span className={menuItemLeft}>
                        <HiUserAdd className="w-4 h-4" />
                        Become a Club Member
                      </span>
                      <span />
                    </button>
                  )}

                {userMetadata?.role === "admin" && (
                  <button onClick={handleAdminSettings} className={menuItemRow}>
                    <span className={menuItemLeft}>
                      <HiKey className="w-4 h-4" />
                      Admin Settings
                    </span>
                    <span />
                  </button>
                )}

                <div className={menuDivider} />
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    closeAllMenus();
                    addToast("Sign in to continue.", "info");
                    openLoginModal();
                  }}
                  className={menuItemRow}
                >
                  <span className={menuItemLeft}>
                    <HiUser className="w-4 h-4" />
                    Sign In
                  </span>
                  <span />
                </button>

                <button
                  onClick={() => {
                    closeAllMenus();
                    openSignupModal();
                  }}
                  className={menuItemRow}
                >
                  <span className={menuItemLeft}>
                    <HiUserAdd className="w-4 h-4" />
                    Register
                  </span>
                  <span />
                </button>

                <div className={menuDivider} />
              </>
            )}

            <button type="button" onClick={toggleTheme} className={menuItemRow}>
              <span className={menuItemLeft}>
                <ThemeIcon className="w-4 h-4" />
                {themeLabel}
              </span>
              <span />
            </button>

            <div className={menuDivider} />

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHelpSubmenu((v) => !v)}
                onMouseEnter={() => setShowHelpSubmenu(true)}
                className={menuItemRow}
                aria-haspopup="menu"
                aria-expanded={showHelpSubmenu}
              >
                <span className={menuItemLeft}>
                  <HiQuestionMarkCircle className="w-4 h-4" />
                  Help
                </span>
                <HiChevronRight className="w-4 h-4 text-gray-400 dark:text-white/40" />
              </button>

              {showHelpSubmenu && (
                <div
                  className="absolute bottom-0 left-full ml-2 w-56 bg-white dark:bg-surface-darker rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                  onMouseLeave={() => setShowHelpSubmenu(false)}
                  role="menu"
                >
                  <a
                    href="https://en.wikipedia.org/wiki/Sandwich"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeAllMenus}
                    className={menuItemRow}
                  >
                    <span className={menuItemLeft}>
                      <HiInformationCircle className="w-4 h-4" />
                      About
                    </span>
                    <span />
                  </a>

                  <button
                    type="button"
                    onClick={handleContactUsClick}
                    className={menuItemRow}
                  >
                    <span className={menuItemLeft}>
                      <HiMail className="w-4 h-4" />
                      Contact Us
                    </span>
                    <span />
                  </button>

                  <Link
                    to={ROUTES.LEGAL.PRIVACY_POLICY}
                    onClick={closeAllMenus}
                    className={menuItemRow}
                  >
                    <span className={menuItemLeft}>
                      <HiShieldCheck className="w-4 h-4" />
                      Privacy Policy
                    </span>
                    <span />
                  </Link>

                  <Link
                    to={ROUTES.LEGAL.TERMS_OF_SERVICE}
                    onClick={closeAllMenus}
                    className={menuItemRow}
                  >
                    <span className={menuItemLeft}>
                      <HiDocumentText className="w-4 h-4" />
                      Terms of Service
                    </span>
                    <span />
                  </Link>
                </div>
              )}
            </div>

            {isAuthenticated && user && userMetadata && (
              <>
                <div className={menuDivider} />
                <button onClick={handleLogout} className={menuItemRow}>
                  <span className={menuItemLeft}>
                    <HiLogout className="w-4 h-4" />
                    Sign Out
                  </span>
                  <span />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarFooter;
