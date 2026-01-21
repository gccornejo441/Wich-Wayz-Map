import React, { createContext, useContext, useState } from "react";
import { Callback, UpdateShopPayload } from "../types/dataTypes";

interface ModalContextProps {
  isLoginModalOpen: boolean;
  loginMode: boolean;
  currentModal: "login" | "signup" | "updateShop" | null;
  onSearchModal: Callback;
  openLoginModal: Callback;
  openSignupModal: Callback;
  switchToLogin: Callback;
  switchToSignup: Callback;
  isSearchModalOpen: boolean;
  closeModal: Callback;
  openUpdateShopModal: (data: UpdateShopModalProps) => void;
  updateShopData: UpdateShopModalProps | null;
}

interface UpdateShopModalProps {
  shopId: number;
  shopData: UpdateShopPayload;
}

export const ModalContext = createContext<ModalContextProps | undefined>(
  undefined,
);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState(true);
  const [currentModal, setCurrentModal] = useState<
    "login" | "signup" | "updateShop" | null
  >(null);
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  const [updateShopData, setUpdateShopData] =
    useState<UpdateShopModalProps | null>(null);

  const openLoginModal = () => {
    setCurrentModal("login");
    setLoginMode(true);
    setLoginModalOpen(true);
  };

  const openSignupModal = () => {
    setCurrentModal("signup");
    setLoginMode(false);
    setLoginModalOpen(true);
  };

  const switchToLogin = () => {
    setCurrentModal("login");
    setLoginMode(true);
  };

  const switchToSignup = () => {
    setCurrentModal("signup");
    setLoginMode(false);
  };

  const openUpdateShopModal = (data: UpdateShopModalProps) => {
    setCurrentModal("updateShop");
    setUpdateShopData(data);
  };

  const closeModal = () => {
    setLoginModalOpen(false);
    setSearchModalOpen(false);
    setCurrentModal(null);
    setUpdateShopData(null);
  };

  const onSearchModal = () => {
    setSearchModalOpen(true);
  };

  return (
    <ModalContext.Provider
      value={{
        isLoginModalOpen,
        isSearchModalOpen,
        loginMode,
        currentModal,
        openLoginModal,
        openSignupModal,
        switchToLogin,
        switchToSignup,
        onSearchModal,
        openUpdateShopModal,
        updateShopData,
        closeModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
