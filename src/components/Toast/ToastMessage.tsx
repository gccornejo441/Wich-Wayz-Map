import { Toast } from "flowbite-react";
import { HiCheck, HiX } from "react-icons/hi";
import { ToastMessageProps } from "../../types/dataTypes";

const ToastMessage = ({
  toastMessage,
  toastType,
  position = "bottom-5 right-5",
}: ToastMessageProps) => {
  return (
    <div className={`fixed ${position}`}>
      <Toast>
        <div
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
            toastType === "success"
              ? "bg-green-300 text-green-500"
              : "bg-red-300 text-red-500"
          }`}
        >
          {toastType === "success" ? (
            <HiCheck className="h-5 w-5" />
          ) : (
            <HiX className="h-5 w-5" />
          )}
        </div>
        <div
          className={`ml-3 text-sm font-medium ${
            toastType === "success" ? "text-green-500" : "text-red-500"
          }`}
        >
          {toastMessage}
        </div>
      </Toast>
    </div>
  );
};

export default ToastMessage;
