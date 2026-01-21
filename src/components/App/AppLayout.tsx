import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import NavBar from "../NavBar/Navbar";
import { useModal } from "../../context/modalContext";
import UpdateShop from "../Modal/UpdateShop";
import AuthModal from "../Modal/AuthModal";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import ShopListSidebar from "../Sidebar/ShopListSidebar";
import MapSidebar from "../Sidebar/MapSidebar";
import { useSidebar } from "@/context/sidebarContext";

interface AppLayoutProps {
  fullBleed?: boolean;
}

const AppLayout = ({ fullBleed = false }: AppLayoutProps) => {
  const { currentModal } = useModal();
  const {
    shopListOpen,
    closeShopList,
    sidebarOpen: mapSidebarOpen,
    closeSidebar: closeMapSidebar,
  } = useShopSidebar();

  const { isOpen: isSidebarOpen, closeSidebar, toggleSidebar } = useSidebar();

  const sidebarRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Handler for sidebar toggle button - closes MapSidebar and opens main Sidebar if MapSidebar is open
  const handleToggleSidebar = () => {
    if (mapSidebarOpen) {
      closeMapSidebar();
      if (!isSidebarOpen) {
        toggleSidebar();
      }
    } else {
      toggleSidebar();
    }
  };

  useEffect(() => {
    if (shopListOpen) closeSidebar();
  }, [shopListOpen, closeSidebar]);

  useEffect(() => {
    if (isSidebarOpen && shopListOpen) closeShopList();
  }, [isSidebarOpen, shopListOpen, closeShopList]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        closeSidebar();
      }
    };

    if (isSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSidebarOpen, closeSidebar]);

  return (
    <div className="relative min-h-[100dvh] bg-gray-100 dark:bg-surface-dark transition-colors duration-500">
      <div ref={sidebarRef} className="relative z-20">
        <NavBar
          onToggleSidebar={handleToggleSidebar}
          searchBar={!isSidebarOpen && !mapSidebarOpen}
          navRef={navRef}
        />
        <Sidebar />
        <ShopListSidebar isOpen={shopListOpen} />
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
