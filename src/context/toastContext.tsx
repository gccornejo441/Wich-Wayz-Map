import { createContext, useContext, useState, ReactNode } from "react";
import { HiCheckCircle, HiXCircle, HiInformationCircle } from "react-icons/hi";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID ? crypto.randomUUID() : new Date().toISOString();

    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 space-y-2">
        {toasts.map((toast) => {
          const borderClass =
            toast.type === "success"
              ? "border-green-500"
              : toast.type === "error"
              ? "border-red-500"
              : "border-blue-500";

          const icon =
            toast.type === "success" ? (
              <HiCheckCircle className="text-green-500" />
            ) : toast.type === "error" ? (
              <HiXCircle className="text-red-500" />
            ) : (
              <HiInformationCircle className="text-blue-500" />
            );

          return (
            <div
              key={toast.id}
              className={`flex items-center rounded border-l-4 p-4 text-sm shadow-lg transition-all duration-300
                bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100
                ${borderClass}`}
            >
              <div className="mr-3">{icon}</div>
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextProps => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
