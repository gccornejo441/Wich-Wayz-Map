import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import NavBar from "../NavBar/Navbar";
import LocationSubmit from "../Modal/LocationSubmit";
import { useModal } from "../../context/modalContext";
import { useAuth } from "../../context/authContext";
import UpdateShop from "../Modal/UpdateShop";
import { useToast } from "../../context/toastContext";
import SideNav from "../Sidebar/SideNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchBar, setSearchBar] = useState(false);
  const { addToast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const { currentModal } = useModal();
  const location = useLocation();

  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const toggleLocation = async () => {
    if (isAuthenticated && user?.emailVerified) {
      setModalOpen(!isModalOpen);
    } else {
      addToast("Verify your email before submitting your location.", "error");
    }
  };

  const onSearch = () => setSearchBar((prev) => !prev);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-lightGray">
      <NavBar searchBar={searchBar} setSearchBar={setSearchBar} />
      <div className="flex flex-col">
        <div ref={sidebarRef}>
          {!searchBar && (
            <SideNav onToggleSidebar={toggleSidebar} onSearch={onSearch} />
          )}
          <div ref={sidebarRef}>
            <Sidebar
              isOpen={isSidebarOpen}
              onToggleLocation={toggleLocation}
              onToggleSidebar={toggleSidebar}
            />
          </div>
        </div>
        <div className="relative z-10">
          <div className="container mx-auto md:px-4 md:py-6">{children}</div>
        </div>
      </div>

      {isModalOpen && <LocationSubmit onClose={toggleLocation} />}
      {currentModal === "updateShop" && <UpdateShop />}
    </div>
  );
};

export default AppLayout;
