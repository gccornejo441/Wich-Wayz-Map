import { ShopGeoJsonProperties } from "@/components/Map/MapBox";
import { useState, createContext, useContext, useEffect } from "react";

type Coordinates = [number, number];

interface ShopSidebarContextProps {
  selectedShop: ShopGeoJsonProperties | null;
  position: Coordinates | null;
  sidebarOpen: boolean;
  shopListOpen: boolean;
  openSidebar: (
    shop: ShopGeoJsonProperties,
    position?: Coordinates | null,
  ) => void;
  closeSidebar: () => void;
  openShopList: () => void;
  closeShopList: () => void;
  savedShops: ShopGeoJsonProperties[];
  addSavedShop: (shop: ShopGeoJsonProperties) => void;
  removeSavedShop: (shopId: number | string) => void;
  selectShop: (shop: ShopGeoJsonProperties) => void;
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
  const [savedShops, setSavedShops] = useState<ShopGeoJsonProperties[]>([]);
  const [shopListOpen, setShopListOpen] = useState(false);

  const openShopList = () => setShopListOpen(true);
  const closeShopList = () => setShopListOpen(false);

  // Derive position from selectedShop coordinates when available
  useEffect(() => {
    if (selectedShop) {
      const { longitude, latitude } = selectedShop;
      if (
        typeof longitude === "number" &&
        typeof latitude === "number" &&
        Number.isFinite(longitude) &&
        Number.isFinite(latitude)
      ) {
        setPosition([longitude, latitude]);
      }
    }
  }, [selectedShop]);

  const openSidebar = (
    shop: ShopGeoJsonProperties,
    pos?: Coordinates | null,
  ) => {
    setSelectedShop(shop);
    if (pos) setPosition(pos);
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSelectedShop(null);
    setSidebarOpen(false);
  };

  /**
   * Select a shop and open the sidebar.
   * Automatically derives position from shop coordinates.
   */
  const selectShop = (shop: ShopGeoJsonProperties) => {
    setSelectedShop(shop);
    setSidebarOpen(true);
  };

  const addSavedShop = (shop: ShopGeoJsonProperties) => {
    setSavedShops((prev) => {
      const exists = prev.some((s) => s.shopId === shop.shopId);
      return exists ? prev : [...prev, shop];
    });
  };

  const removeSavedShop = (shopId: number | string) => {
    setSavedShops((prev) => prev.filter((s) => s.shopId !== shopId));
  };

  return (
    <ShopSidebarContext.Provider
      value={{
        selectedShop,
        position,
        sidebarOpen,
        shopListOpen,
        openSidebar,
        closeSidebar,
        openShopList,
        closeShopList,
        savedShops,
        addSavedShop,
        removeSavedShop,
        selectShop,
      }}
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
