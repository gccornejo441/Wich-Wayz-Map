import React, { createContext, useContext, useState } from "react";

interface ModalContextProps {
  isLoginModalOpen: boolean;
  loginMode: boolean;
  currentModal: "login" | "signup" | "reset";
  openResetModal: () => void;

  openLoginModal: () => void;
  openSignupModal: () => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState(true);
  const [currentModal, setCurrentModal] = useState<
    "login" | "signup" | "reset"
  >("login");

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
  };

  return (
    <ModalContext.Provider
      value={{
        isLoginModalOpen,
        loginMode,
        currentModal,
        openLoginModal,
        openSignupModal,
        openResetModal,
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
