import { useState, useEffect, useRef } from "react";
import { FiX, FiCopy, FiCheck } from "react-icons/fi";

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  shopName?: string;
  onCopySuccess: () => void;
  onCopyError: () => void;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  url,
  shopName,
  onCopySuccess,
  onCopyError,
}) => {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);
        return successful;
      } catch {
        document.body.removeChild(textarea);
        return false;
      }
    } catch (error) {
      console.error("Copy failed:", error);
      return false;
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      onCopySuccess();
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } else {
      onCopyError();
    }
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleInputFocus = () => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-text-base dark:text-text-inverted">
            {shopName ? `Share ${shopName}` : "Share this shop"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-text-muted dark:text-text-inverted hover:text-text-base dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-muted dark:hover:bg-surface-darker focus:outline-none focus:ring-2 focus:ring-brand-secondary"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* URL Input */}
        <div className="mb-4">
          <label
            htmlFor="share-url"
            className="block text-sm font-medium text-text-muted dark:text-text-inverted mb-2"
          >
            Share Link
          </label>
          <input
            ref={inputRef}
            id="share-url"
            type="text"
            readOnly
            value={url}
            onFocus={handleInputFocus}
            className="w-full p-3 border border-surface-dark/20 dark:border-surface-muted/20 rounded-lg bg-surface-muted dark:bg-surface-darker text-text-base dark:text-text-inverted text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary"
          />
        </div>

        {/* Copy Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-muted dark:bg-surface-dark text-text-base dark:text-text-inverted hover:bg-surface-dark dark:hover:bg-surface-darker transition-colors focus:outline-none focus:ring-2 focus:ring-brand-secondary"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            disabled={copied}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-secondary flex items-center gap-2 ${
              copied
                ? "bg-green-600 text-white cursor-default"
                : "bg-brand-primary text-white hover:bg-opacity-90"
            }`}
          >
            {copied ? (
              <>
                <FiCheck size={18} />
                Copied!
              </>
            ) : (
              <>
                <FiCopy size={18} />
                Copy link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
