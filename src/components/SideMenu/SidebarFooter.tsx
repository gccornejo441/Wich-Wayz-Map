import { useState } from "react";
import ToastMessage from "../Toast/ToastMessage";

const SidebarFooter = () => {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const handleContactUsClick = () => {
    const email = "wich.wayz.map@gmail.com";
    navigator.clipboard
      .writeText(email)
      .then(() => {
        setToast({ message: "Email copied to clipboard!", type: "success" });
      })
      .catch(() => {
        setToast({ message: "Failed to copy email.", type: "error" });
      });

    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="px-4 mt-8 border-t border-white/20 pt-4">
      <p className="text-xs text-white">© 2024 Wich Wayz?</p>
      <div className="flex flex-wrap text-xs text-white/70 mt-2 space-x-4">
        <a
          href="https://en.wikipedia.org/wiki/Sandwich"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition"
        >
          About
        </a>
        <button
          onClick={handleContactUsClick}
          className="hover:text-white transition"
        >
          Contact Us
        </button>
      </div>
      {toast && (
        <ToastMessage
          toastMessage={toast.message}
          toastType={toast.type}
          position="bottom-5 right-5"
        />
      )}
    </div>
  );
};

export default SidebarFooter;
