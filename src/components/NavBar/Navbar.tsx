import { SidebarToggleButton } from "../SideMenu/SidebarButtons";
import Logo from "../Logo/Logo";
import SearchBar from "../Search/SearchBar";
import { Link } from "react-router-dom";
import UserAvatar from "../Avatar/UserAvatar";
import { Dropdown, Toast } from "flowbite-react";
import { useState } from "react";
import { useAuth } from "../../context/authContext";
import { HiLogin, HiLogout, HiUserAdd } from "react-icons/hi";
import { useNavigate } from "react-router";
import { createPaymentLink } from "../../services/stripe";
import { ROUTES } from "../../constants/routes";
import { Callback } from "../../types/dataTypes";

interface NavBarProps {
  onToggleSidebar: Callback;
}

const NavBar = ({ onToggleSidebar }: NavBarProps) => {
  const { isAuthenticated, logout, userMetadata } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const navigate = useNavigate();

  const showToast = (message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleAuthAction = () => {
    if (isAuthenticated) {
      logout();
      showToast("You have been logged out successfully.", "success");
    } else {
      navigate(ROUTES.ACCOUNT.SIGN_IN);
    }
  };

  const handleSignup = async () => {
    if (isAuthenticated) {
      try {
        const paymentLink = await createPaymentLink(
          userMetadata?.id,
          userMetadata?.email,
        );
        window.location.href = paymentLink;
      } catch (error) {
        showToast("Failed to create payment link. Please try again.", "error");
        console.error("Error creating payment link:", error);
      }
    } else {
      navigate(ROUTES.ACCOUNT.REGISTER);
    }
  };

  return (
    <>
      <nav className="bg-primary border-b border-secondary absolute top-0 left-0 w-full">
        <div className="w-full h-12 mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarToggleButton onClick={onToggleSidebar} />
            <div className="flex items-center gap-2 cursor-pointer">
              <Link to="/" className="flex items-center gap-2 cursor-pointer">
                <Logo imageSource="/Wich-Wayz-Logo.svg" className="h-10" />
              </Link>
            </div>
          </div>
          <div className="hidden md:flex w-1/2">
            <SearchBar />
          </div>
          <div className="flex items-center gap-4">
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
              className="rounded-lg shadow-lg bg-white border border-lightGray"
            >
              {isAuthenticated ? (
                <>
                  <Dropdown.Header className="px-4 py-2 text-sm text-gray-700">
                    <span className="block font-semibold text-base text-accent">
                      {userMetadata?.username}
                    </span>
                    <span className="block truncate text-sm text-primary">
                      {userMetadata?.email}
                    </span>
                  </Dropdown.Header>
                  {userMetadata?.verified &&
                    userMetadata?.membershipStatus !== "member" && (
                      <Dropdown.Item
                        icon={HiUserAdd}
                        onClick={handleSignup}
                        className="flex items-center gap-4 px-4 py-2 text-gray-700 hover:text-white hover:bg-primary rounded-lg transition duration-300 ease-in-out"
                      >
                        Become a Club Member
                      </Dropdown.Item>
                    )}
                  <Dropdown.Divider />
                  <Dropdown.Item
                    icon={HiLogout}
                    onClick={handleAuthAction}
                    className="flex items-center gap-4 px-4 py-2 text-gray-700 hover:text-white hover:bg-red-500 rounded-lg transition duration-300 ease-in-out"
                  >
                    Sign Out
                  </Dropdown.Item>
                </>
              ) : (
                <>
                  <Dropdown.Item
                    icon={HiLogin}
                    onClick={handleAuthAction}
                    className="flex items-center gap-4 px-4 py-2 text-gray-700 hover:text-white hover:bg-primary rounded-lg transition duration-300 ease-in-out"
                  >
                    Sign In
                  </Dropdown.Item>
                  <Dropdown.Item
                    icon={HiUserAdd}
                    onClick={handleSignup}
                    className="flex items-center gap-4 px-4 py-2 text-gray-700 hover:text-white hover:bg-red-500 rounded-lg transition duration-300 ease-in-out"
                  >
                    Register
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <div className="px-4 py-2 text-sm text-gray-500">Guest</div>
                </>
              )}
            </Dropdown>
          </div>
        </div>
        {toastMessage && (
          <div className="fixed bottom-5 left-5">
            <Toast>
              <div
                className={`ml-3 text-sm font-normal ${
                  toastType === "success" ? "text-green-500" : "text-red-500"
                }`}
              >
                {toastMessage}
              </div>
            </Toast>
          </div>
        )}
      </nav>
    </>
  );
};

export default NavBar;
