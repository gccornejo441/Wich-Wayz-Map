import React from "react";
import { Callback } from "../../types/dataTypes";

interface ModalWrapperProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "small" | "medium" | "large";
  className?: string;
  onClose?: Callback;
  showCloseButton?: boolean;
}

const ModalWrapper = ({
  children,
  header,
  footer,
  size = "medium",
  className = "",
  onClose,
  showCloseButton = true,
}: ModalWrapperProps) => {
  const sizeClasses = {
    small: "max-w-sm",
    medium: "max-w-md",
    large: "max-w-lg",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div
        className={`relative w-full ${sizeClasses[size]} max-h-full rounded-lg shadow-card ${className}`}
        style={{ overflow: "visible" }}
      >
        {showCloseButton && onClose && (
          <button
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            onClick={onClose}
            aria-label="Close"
          >
            ✖
          </button>
        )}
        {header && <div className="mb-4 border-b pb-2">{header}</div>}
        <div className="modal-body">{children}</div>
        {footer && <div className="mt-4 border-t pt-2">{footer}</div>}
      </div>
    </div>
  );
};

export default ModalWrapper;
