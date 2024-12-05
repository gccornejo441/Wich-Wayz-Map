import { useState } from "react";
import {
  HiShare,
  HiHeart,
  HiOutlineRefresh,
  HiClipboardCopy,
  HiOutlineDotsHorizontal,
  HiMap,
} from "react-icons/hi";
import WarningDialog from "../Modal/Dialog/WarningDialog";
import { refreshCache } from "../../services/indexedDB";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

const SpeedDial = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen((prev) => !prev);

  const shareableLink = window.location.href;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      alert("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy link:", error);
      alert("Failed to copy link. Please try again.");
    }
  };

  const handleRefreshCache = async () => {
    setIsProcessing(true);
    await refreshCache();
    setIsProcessing(false);
    setIsWarningOpen(false);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-6 right-3 group">
      <div
        className={`flex flex-col justify-end ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        } transition-all duration-300 ease-out py-1 mb-4 space-y-2 border border-gray-100 rounded-lg shadow-sm bg-primary`}
      >
        <ul className="text-sm text-white">
          <li>
            <button
              onClick={() => navigate(ROUTES.SHOPS.ADD)}
              className="flex items-center px-5 py-2 w-full text-left"
            >
              <HiMap className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Add Shop</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center px-5 py-2 w-full text-left"
            >
              <HiShare className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Share</span>
            </button>
          </li>

          <li>
            <a
              href="https://ko-fi.com/wichwayz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-5 py-2"
            >
              <HiHeart className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Donate</span>
            </a>
          </li>
          <li>
            <button
              onClick={() => setIsWarningOpen(true)}
              className="flex items-center px-5 py-2 w-full text-left"
            >
              <HiOutlineRefresh className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Refresh Map</span>
            </button>
          </li>
        </ul>
      </div>

      <button
        type="button"
        onClick={toggleMenu}
        aria-controls="speed-dial-menu-dropdown"
        aria-expanded={isOpen}
        className="flex items-center justify-center ml-auto text-white bg-primary rounded-full w-14 h-14  focus:ring-4 focus:ring-primary/50 focus:outline-none"
      >
        <HiOutlineDotsHorizontal className="w-6 h-6" aria-hidden="true" />
        <span className="sr-only">Open actions menu</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-96 p-6">
            <h2 className="text-lg font-semibold mb-4">Share this App</h2>
            <p className="text-sm mb-4">Copy the link below to share:</p>
            <div className="flex items-center justify-between border rounded p-2 mb-4">
              <span className="truncate">{shareableLink}</span>
              <button onClick={handleCopyLink} className="ml-2 text-primary">
                <HiClipboardCopy className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2 text-white bg-primary rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <WarningDialog
        isOpen={isWarningOpen}
        onConfirm={handleRefreshCache}
        onCancel={() => setIsWarningOpen(false)}
        isProcessing={isProcessing}
        title="Refresh Map"
        message="Refreshing the map will update it with the latest data from the database. Do you want to proceed?"
        confirmText="Refresh"
      />
    </div>
  );
};

export default SpeedDial;
