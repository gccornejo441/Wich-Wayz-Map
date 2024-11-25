import React, { createContext, useContext, useState } from "react";

interface ModalContextProps {
  isLoginModalOpen: boolean;
  loginMode: boolean;
  currentModal: "login" | "signup" | "reset";
  openResetModal: () => void;
  onSearchModal: () => void;
  openLoginModal: () => void;
  openSignupModal: () => void;
  isSearchModalOpen: boolean;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState(true);
  const [currentModal, setCurrentModal] = useState<
    "login" | "signup" | "reset"
  >("login");
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);

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

  const openResetModal = () => {
    setCurrentModal("reset");
    setLoginModalOpen(true);
  };

  const closeModal = () => {
    setLoginModalOpen(false);
    setSearchModalOpen(false);
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
        openResetModal,
        onSearchModal,
        closeModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
