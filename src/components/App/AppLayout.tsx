import React, { useState } from "react";
import Sidebar from "../SideMenu/Sidebar";
import NavBar from "../NavBar/Navbar";
import LocationSubmit from "../Modal/LocationSubmit";
import ToastMessage from "../Toast/ToastMessage";
import { useModal } from "../../context/modalContext";
import LoginModal from "../Modal/Login";
import { useAuth } from "../../context/authContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const { isAuthenticated, user } = useAuth();

  const {
    isLoginModalOpen,
    currentModal,
    closeModal,
    openLoginModal,
    openSignupModal,
  } = useModal();

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  const toggleLocation = async () => {
    if (isAuthenticated && user?.membership_status === "member") {
      setModalOpen(!isModalOpen);
    } else {
      setToastMessage(
        "Only members can submit locations. Please join as a member.",
      );
      setToastType("error");
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  return (
    <div className="relative">
      <NavBar
        onToggleSidebar={toggleSidebar}
        onToggleLoginModel={openLoginModal}
      />
      <div className="flex">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggleLocation={toggleLocation}
          onToggleSidebar={toggleSidebar}
        />
        <div
          className={`flex-1 bg-gray-100 transition-all duration-500 ease-in-out ${
            isSidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          {children}
        </div>
      </div>
      {isModalOpen && <LocationSubmit onClose={toggleLocation} />}
      {isLoginModalOpen && (
        <>
          {currentModal === "login" && (
            <LoginModal
              onClose={closeModal}
              onSwitchToSignup={openSignupModal}
            />
          )}
        </>
      )}
      {toastMessage && (
        <ToastMessage
          toastMessage={toastMessage}
          toastType={toastType}
          position="bottom-5 right-5"
        />
      )}
    </div>
  );
};

export default AppLayout;
