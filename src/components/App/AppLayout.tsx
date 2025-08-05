import React, { useEffect, useRef } from "react";
import Sidebar from "../Sidebar/Sidebar";
import NavBar from "../NavBar/Navbar";
import { useModal } from "../../context/modalContext";
import UpdateShop from "../Modal/UpdateShop";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import ShopListSidebar from "../Sidebar/ShopListSidebar";
import MapSidebar from "../Sidebar/MapSidebar";
import { useSidebar } from "@/context/sidebarContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { currentModal } = useModal();
  const {
    shopListOpen,
    closeShopList,
    sidebarOpen: mapSidebarOpen,
  } = useShopSidebar();

  const { isOpen: isSidebarOpen, closeSidebar, toggleSidebar } = useSidebar();

  const sidebarRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close sidebar when ShopList is opened
  useEffect(() => {
    if (shopListOpen) closeSidebar();
  }, [shopListOpen, closeSidebar]);

  // Close ShopList if Sidebar is opened
  useEffect(() => {
    if (isSidebarOpen && shopListOpen) closeShopList();
  }, [isSidebarOpen, shopListOpen, closeShopList]);

  // Close Sidebar when clicking outside
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
    <div className="relative min-h-screen bg-gray-100 dark:bg-surface-dark transition-colors duration-500">
      <div className="flex flex-col">
        <div ref={sidebarRef}>
          <NavBar
            onToggleSidebar={toggleSidebar}
            searchBar={!isSidebarOpen && !mapSidebarOpen}
            navRef={navRef}
          />
          <Sidebar />
          <ShopListSidebar isOpen={shopListOpen} />
          <MapSidebar />
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-center">
        <div className="container mx-auto md:px-4 md:py-6">{children}</div>
      </div>
      {currentModal === "updateShop" && <UpdateShop />}
    </div>
  );
};

export default AppLayout;
