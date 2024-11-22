import { WarningDialogProps } from "../../../types/dataTypes";
import { HiOutlineExclamation, HiX } from "react-icons/hi";

const WarningDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  isProcessing = false,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Refresh",
  cancelText = "Cancel",
}: WarningDialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      id="popup-modal"
      tabIndex={-1}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center w-full h-full bg-dark bg-opacity-50"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white rounded-lg shadow-card font-sans">
          <button
            type="button"
            className="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg w-8 h-8 inline-flex justify-center items-center"
            onClick={onCancel}
          >
            <HiX className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">Close modal</span>
          </button>
          <div className="p-4 md:p-5 text-center">
            <HiOutlineExclamation className="mx-auto mb-4 text-primary w-12 h-12" />
            <h3 className="mb-5 text-lg font-semibold text-dark">{title}</h3>
            <p className="mb-5 text-sm text-gray-500">{message}</p>
            <button
              onClick={onConfirm}
              type="button"
              disabled={isProcessing}
              className={`text-white font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 
                  ${
                    isProcessing
                      ? "bg-gray-400"
                      : "bg-primary hover:bg-secondary"
                  } focus:outline-none focus:ring-4 focus:ring-secondary transition-all`}
            >
              {isProcessing ? "Processing..." : confirmText}
            </button>
            <button
              onClick={onCancel}
              type="button"
              className="py-2.5 px-5 ms-3 text-sm font-medium text-dark focus:outline-none bg-background rounded-lg border border-secondary hover:bg-gray-100 focus:z-10 focus:ring-4 focus:ring-secondary"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarningDialog;
