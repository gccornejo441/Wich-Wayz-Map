import { createContext, useContext, useState, ReactNode } from "react";

export interface Shop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface SavedShopsContextProps {
  savedShops: Shop[];
  saveShop: (shop: Shop) => void;
  removeShop: (id: string) => void;
}

const SavedShopsContext = createContext<SavedShopsContextProps | null>(null);

export const SavedShopsProvider = ({ children }: { children: ReactNode }) => {
  const [savedShops, setSavedShops] = useState<Shop[]>([]);

  const saveShop = (shop: Shop) => {
    setSavedShops((prev) =>
      prev.some((s) => s.id === shop.id) ? prev : [...prev, shop]
    );
  };

  const removeShop = (id: string) => {
    setSavedShops((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <SavedShopsContext.Provider value={{ savedShops, saveShop, removeShop }}>
      {children}
    </SavedShopsContext.Provider>
  );
};

export const useSavedShops = () => {
  const context = useContext(SavedShopsContext);
  if (!context) throw new Error("useSavedShops must be used within Provider");
  return context;
};
