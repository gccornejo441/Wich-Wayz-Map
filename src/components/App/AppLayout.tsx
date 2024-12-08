import React, { useState } from "react";
import Sidebar from "../SideMenu/Sidebar";
import NavBar from "../NavBar/Navbar";
import LocationSubmit from "../Modal/LocationSubmit";
import ToastMessage from "../Toast/ToastMessage";
import { useModal } from "../../context/modalContext";
import { useAuth } from "../../context/authContext";
import SearchWrapper from "../Modal/SearchWrapper";
import UpdateShop from "../Modal/UpdateShop";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const { isAuthenticated, user } = useAuth();

  const { currentModal, closeModal, isSearchModalOpen, onSearchModal } =
    useModal();

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  const toggleLocation = async () => {
    if (isAuthenticated && user?.emailVerified) {
      setModalOpen(!isModalOpen);
    } else {
      setToastMessage("Verify your email before submitting your location.");
      setToastType("error");
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  return (
    <div className="relative min-h-screen bg-lightGray">
      <NavBar onToggleSidebar={toggleSidebar} />

      <div
        className={`absolute top-0 left-0 h-full z-50 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "16rem" }}
      >
        <Sidebar
          onToggleSearch={onSearchModal}
          isOpen={isSidebarOpen}
          onToggleLocation={toggleLocation}
          onToggleSidebar={toggleSidebar}
        />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto md:px-4 md:py-6">{children}</div>
      </div>

      {isModalOpen && <LocationSubmit onClose={toggleLocation} />}
      {isSearchModalOpen && <SearchWrapper onClose={closeModal} />}
      {currentModal === "updateShop" && <UpdateShop />}

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
