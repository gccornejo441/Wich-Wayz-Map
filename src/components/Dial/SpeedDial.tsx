import { useState } from "react";
import {
  HiShare,
  HiHeart,
  HiOutlineRefresh,
  HiOutlineDotsHorizontal,
  HiPlus,
  HiClipboardCopy,
  HiLocationMarker,
} from "react-icons/hi";
import WarningDialog from "../Modal/Dialog/WarningDialog";
import { refreshCache } from "../../services/indexedDB";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "@/context/authContext";
import { BaseItemProps, SidebarItem } from "../Sidebar/Sidebar";

export const DialItem = ({
  linkTo,
  onClick,
  icon,
  text,
  badge,
  disabled,
  external,
}: BaseItemProps) => {
  return (
    <SidebarItem
      onClick={onClick}
      linkTo={linkTo}
      icon={icon}
      text={text}
      badge={badge}
      disabled={disabled}
      external={external}
    />
  );
};

const SpeedDial = ({ onLocateUser }: { onLocateUser: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { isAuthenticated, user } = useAuth();
  const isMember = isAuthenticated && user?.emailVerified;

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
    <div className="fixed bottom-6 right-3 z-50 group pointer-events-none">
      <div
        className={`flex flex-col justify-end px-1 pointer-events-auto ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        } transition-all duration-300 ease-out py-1 mb-4 space-y-2 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm bg-brand-primary dark:bg-surface-darker`}
      >
        <ul className="text-sm text-white">
          <li>
            <DialItem
              linkTo={ROUTES.SHOPS.ADD}
              icon={<HiPlus className="w-5 h-5 text-white" />}
              text="Add Shop"
              badge={!isMember ? "Members Only" : undefined}
              disabled={!isMember}
            />
          </li>
          <li>
            <DialItem
              onClick={handleCopyLink}
              icon={<HiShare className="w-5 h-5 text-white" />}
              text="Copy Link"
            />
          </li>
          <li>
            <DialItem
              linkTo="https://ko-fi.com/wichwayz"
              external
              icon={<HiHeart className="w-5 h-5 text-white" />}
              text="Donate"
            />
          </li>
          <li>
            <DialItem
              onClick={() => setIsWarningOpen(true)}
              icon={<HiOutlineRefresh className="w-5 h-5 text-white" />}
              text="Refresh Map"
            />
          </li>
          <li>
            <DialItem
              onClick={onLocateUser}
              icon={<HiLocationMarker className="w-5 h-5 text-white" />}
              text="My Location"
            />
          </li>
        </ul>
      </div>

      <button
        type="button"
        onClick={toggleMenu}
        aria-controls="speed-dial-menu-dropdown"
        aria-expanded={isOpen}
        className="flex items-center justify-center ml-auto text-white bg-brand-primary dark:bg-surface-darker rounded-full w-14 h-14 focus:ring-4 focus:outline-none focus:ring-brand-primary/50 dark:focus:ring-surface-dark/50 pointer-events-auto touch-manipulation"
      >
        <HiOutlineDotsHorizontal className="w-6 h-6" aria-hidden="true" />
        <span className="sr-only">Open actions menu</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted rounded-lg shadow-lg w-96 p-6">
            <h2 className="text-lg font-semibold mb-4">Share this App</h2>
            <p className="text-sm mb-4">Copy the link below to share:</p>
            <div className="flex items-center justify-between border rounded p-2 mb-4 dark:border-gray-700">
              <span className="truncate">{shareableLink}</span>
              <button
                onClick={handleCopyLink}
                className="ml-2 text-primary dark:text-brand-secondary"
              >
                <HiClipboardCopy className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2 text-white bg-brand-primary dark:bg-surface-darker rounded"
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
