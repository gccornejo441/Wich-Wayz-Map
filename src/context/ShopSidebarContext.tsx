import { ShopGeoJsonProperties } from "@/components/Map/MapBox";
import { useState, createContext, useContext } from "react";

type Coordinates = [number, number];

interface ShopSidebarContextProps {
  selectedShop: ShopGeoJsonProperties | null;
  position: Coordinates | null;
  sidebarOpen: boolean;
  openSidebar: (
    shop: ShopGeoJsonProperties,
    position?: Coordinates | null,
  ) => void;
  closeSidebar: () => void;
}

const ShopSidebarContext = createContext<ShopSidebarContextProps | undefined>(
  undefined,
);

export const ShopSidebarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selectedShop, setSelectedShop] =
    useState<ShopGeoJsonProperties | null>(null);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = (
    shop: ShopGeoJsonProperties,
    pos?: Coordinates | null,
  ) => {
    setSelectedShop(shop);
    if (pos) {
      setPosition(pos);
    }
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSelectedShop(null);
    setSidebarOpen(false);
  };

  return (
    <ShopSidebarContext.Provider
      value={{ selectedShop, position, sidebarOpen, openSidebar, closeSidebar }}
    >
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
