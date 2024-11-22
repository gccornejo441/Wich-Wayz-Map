import React, { useState } from "react";
import { FiShare2, FiHeart, FiCopy } from "react-icons/fi";

const SpeedDial: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <div className="fixed bottom-6 right-3 group">
      <div
        id="speed-dial-menu-dropdown"
        className={`flex flex-col justify-end ${
          isOpen ? "flex" : "hidden"
        } py-1 mb-4 space-y-2 border border-gray-100 rounded-lg shadow-sm bg-primary `}
      >
        <ul className="text-sm text-white">
          <li>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center px-5 py-2 w-full text-left"
            >
              <FiShare2 className="w-5 h-5 mr-2" />
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
              <FiHeart className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Donate</span>
            </a>
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
        <svg
          className="w-6 h-6"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 16 3"
        >
          <path d="M2 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6.041 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM14 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
        </svg>
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
                <FiCopy className="w-5 h-5" />
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
    </div>
  );
};

export default SpeedDial;
