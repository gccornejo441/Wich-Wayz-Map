import { ShopGeoJsonProperties } from "@/components/Map/MapBox";
import { useState, createContext, useContext } from "react";

interface ShopSidebarContextProps {
  selectedShop: ShopGeoJsonProperties | null;
  sidebarOpen: boolean;
  openSidebar: (shop: ShopGeoJsonProperties) => void;
  closeSidebar: () => void;
}

const ShopSidebarContext = createContext<ShopSidebarContextProps | undefined>(undefined);

export const ShopSidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedShop, setSelectedShop] = useState<ShopGeoJsonProperties | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = (shop: ShopGeoJsonProperties) => {
    setSelectedShop(shop);
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSelectedShop(null);
    setSidebarOpen(false);
  };

  return (
    <ShopSidebarContext.Provider value={{ selectedShop, sidebarOpen, openSidebar, closeSidebar }}>
      {children}
    </ShopSidebarContext.Provider>
  );
};

export const useShopSidebar = () => {
  const context = useContext(ShopSidebarContext);
  if (!context) {
    throw new Error("useShopSidebar must be used within a ShopSidebarProvider");
  }
  return context;
};
