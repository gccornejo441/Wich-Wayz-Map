import { createContext, useContext, useState, ReactNode } from "react";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";
type ToastType = "success" | "error";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = new Date().toISOString();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed z-50 bottom-5 right-5 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center p-4 rounded shadow-lg bg-white text-gray-800 text-sm border-l-4 ${
              toast.type === "success" ? "border-green-500" : "border-red-500"
            }`}
          >
            <div className="mr-3">
              {toast.type === "success" ? (
                <HiCheckCircle className="text-green-500 w-6 h-6" />
              ) : (
                <HiXCircle className="text-red-500 w-6 h-6" />
              )}
            </div>
            <span>{toast.message}</span>
          </div>
        ))}
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
