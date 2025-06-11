import Logo from "../Logo/Logo";
import { Link } from "react-router-dom";
import UserAvatar from "../Avatar/UserAvatar";
import { Dropdown } from "flowbite-react";
import { useAuth } from "../../context/authContext";
import { HiLogin, HiLogout, HiUserAdd, HiKey } from "react-icons/hi";
import { useNavigate } from "react-router";
import { createPaymentLink } from "../../services/stripe";
import { ROUTES, useRouteCheck } from "../../constants/routes";
import { useToast } from "../../context/toastContext";
import SearchBar from "../Search/SearchBar";
import { SidebarToggleButton } from "../Sidebar/SidebarButtons";
import { Callback } from "../../types/dataTypes";
import { useShopSidebar } from "@/context/ShopSidebarContext";

interface NavBarProps {
  searchBar: boolean;
  onToggleSidebar: Callback;
  navRef?: React.RefObject<HTMLElement>;
}

const NavBar = ({ searchBar, onToggleSidebar, navRef }: NavBarProps) => {
  const { isAuthenticated, logout, userMetadata } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { showSearchBar, showMap } = useRouteCheck(ROUTES);
  const { shopListOpen } = useShopSidebar();

  const handleAuthAction = () => {
    if (isAuthenticated) {
      logout();
      addToast("You have been logged out successfully.", "success");
    } else {
      navigate(ROUTES.ACCOUNT.SIGN_IN);
    }
  };

  const handleSignup = async () => {
    if (isAuthenticated) {
      try {
        const paymentLink = await createPaymentLink(
          userMetadata?.id,
          userMetadata?.email
        );
        window.location.href = paymentLink;
      } catch (error) {
        addToast("Failed to create payment link. Please try again.", "error");
        console.error("Error creating payment link:", error);
      }
    } else {
      navigate(ROUTES.ACCOUNT.REGISTER);
    }
  };

  const handleAdminSettings = () => {
    navigate(ROUTES.ACCOUNT.ADMIN_SETTINGS);
  };

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 h-12 transition-colors duration-500"
    >
      <div className="w-full bg-brand-primary dark:bg-surface-darker text-white dark:text-text-inverted py-1 px-4 transition-colors duration-500">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            {(showSearchBar || showMap) && (
              <SidebarToggleButton onClick={onToggleSidebar} />
            )}
            <Link to="/" className="flex items-center gap-2 cursor-pointer">
              <Logo imageSource="/Wich-Wayz-Logo.svg" className="h-10" />
            </Link>
          </div>

          {showSearchBar && !shopListOpen && (
            <div className="hidden md:flex w-1/2">
              <SearchBar navRef={navRef} />
            </div>
          )}

          <div className="flex items-center gap-4 z-20">
            <Dropdown
              arrowIcon={false}
              inline={true}
              label={
                <div className="cursor-pointer">
                  <UserAvatar
                    avatarId={userMetadata?.avatar || "default"}
                    userEmail={userMetadata?.email || "guest@example.com"}
                    size="md"
                  />
                </div>
              }
              className="rounded-lg shadow-lg bg-white dark:bg-surface-dark border border-surface-muted dark:border-gray-700 text-sm"
            >
              {isAuthenticated ? (
                <>
                  <Dropdown.Header className="px-4 py-2 text-sm text-gray-700 dark:text-white">
                    <span className="block font-semibold text-base text-accent dark:text-brand-secondary">
                      {userMetadata?.username}
                    </span>
                    <span className="block truncate text-sm text-text-base dark:text-text-inverted">
                      {userMetadata?.email}
                    </span>
                  </Dropdown.Header>

                  {userMetadata?.verified &&
                    userMetadata?.membershipStatus !== "member" && (
                      <Dropdown.Item
                        icon={HiUserAdd}
                        onClick={handleSignup}
                        className="flex items-center gap-4 px-4 py-2 text-gray-700 dark:text-white hover:text-white hover:bg-brand-primary dark:hover:bg-brand-primary rounded-lg transition duration-300 ease-in-out"
                      >
                        Become a Club Member
                      </Dropdown.Item>
                    )}

                  <Dropdown.Divider />
                  {userMetadata?.role === "admin" && (
                    <Dropdown.Item
                      icon={HiKey}
                      onClick={handleAdminSettings}
                      className="flex items-center gap-4 px-4 py-2 text-gray-700 dark:text-white hover:text-white hover:bg-brand-primary dark:hover:bg-brand-primary rounded-lg transition duration-300 ease-in-out"
                    >
                      Admin Settings
                    </Dropdown.Item>
                  )}
                  <Dropdown.Item
                    icon={HiLogout}
                    onClick={handleAuthAction}
                    className="flex items-center gap-4 px-4 py-2 text-gray-700 dark:text-white hover:text-white hover:bg-brand-primary dark:hover:bg-brand-primary rounded-lg transition duration-300 ease-in-out"
                  >
                    Sign Out
                  </Dropdown.Item>
                </>
              ) : (
                <>
                  <Dropdown.Item
                    icon={HiLogin}
                    onClick={handleAuthAction}
                    className="flex items-center gap-4 px-4 py-2 text-gray-700 dark:text-white hover:text-white hover:bg-brand-primary dark:hover:bg-brand-primary rounded-lg transition duration-300 ease-in-out"
                  >
                    Sign In
                  </Dropdown.Item>
                  <Dropdown.Item
                    icon={HiUserAdd}
                    onClick={handleSignup}
                    className="flex items-center gap-4 px-4 py-2 text-gray-700 dark:text-white hover:text-white hover:bg-brand-primary dark:hover:bg-brand-primary rounded-lg transition duration-300 ease-in-out"
                  >
                    Register
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Guest
                  </div>
                </>
              )}
            </Dropdown>
          </div>
        </div>
      </div>

      {showSearchBar && searchBar && !shopListOpen && (
        <div className="flex md:hidden w-full p-2">
          <SearchBar navRef={navRef} />
        </div>
      )}
    </nav>
  );
};

export default NavBar;

