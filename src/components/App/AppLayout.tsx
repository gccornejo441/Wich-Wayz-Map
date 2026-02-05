import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import NavBar from "../NavBar/Navbar";
import { useModal } from "../../context/modalContext";
import UpdateShop from "../Modal/UpdateShop";
import AuthModal from "../Modal/AuthModal";
import MapSidebar from "../Sidebar/MapSidebar";
import NearbySidebar from "../Sidebar/NearbySidebar";
import SavedSidebar from "../Sidebar/SavedSidebar";
import { useOverlay } from "@/context/overlayContext";

interface AppLayoutProps {
  fullBleed?: boolean;
}

const AppLayout = ({ fullBleed = false }: AppLayoutProps) => {
  const { currentModal } = useModal();

  const { isOpen, closeActive, toggle } = useOverlay();

  const isSidebarOpen = isOpen("nav");
  const isShopOpen = isOpen("shop");

  const sidebarRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const handleToggleSidebar = () => {
    toggle("nav");
  };

  // Close any open panel with Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeActive();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeActive]);

  // Click outside to close any open panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        closeActive();
      }
    };

    const anyPanelOpen =
      isOpen("nav") || isOpen("nearby") || isOpen("saved") || isOpen("shop");
    if (anyPanelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeActive]);

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-gray-100 dark:bg-surface-dark transition-colors duration-500">
      <div ref={sidebarRef} className="relative z-20">
        <NavBar
          onToggleSidebar={handleToggleSidebar}
          searchBar={!isSidebarOpen && !isShopOpen}
          navRef={navRef}
        />
        <Sidebar />
        <NearbySidebar />
        <SavedSidebar />
        <MapSidebar />
      </div>

      {fullBleed ? (
        <main className="absolute inset-0 z-0">
          <Outlet />
        </main>
      ) : (
        <main className="relative z-10 flex items-center justify-center">
          <div className="container mx-auto w-full md:px-4 md:py-6">
            <Outlet />
          </div>
        </main>
      )}

      {currentModal === "updateShop" && <UpdateShop />}
      <AuthModal />
    </div>
  );
};

export default AppLayout;
