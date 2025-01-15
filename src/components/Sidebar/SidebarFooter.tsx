import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useToast } from "../../context/toastContext";

const SidebarFooter = () => {
  const { addToast } = useToast();

  const handleContactUsClick = () => {
    const email = "wich.wayz.map@gmail.com";
    navigator.clipboard
      .writeText(email)
      .then(() => {
        addToast("Email copied to clipboard!", "success");
      })
      .catch(() => {
        addToast("Failed to copy email.", "error");
      });
  };

  return (
    <div className="px-4 mt-8 border-t border-white/20 pt-4">
      <p className="text-xs text-white">© 2025 Wich Wayz?</p>
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
        <Link
          to={ROUTES.LEGAL.PRIVACY_POLICY}
          className="hover:text-white transition"
        >
          Privacy Policy
        </Link>
        <Link
          to={ROUTES.LEGAL.TERMS_OF_SERVICE}
          className="hover:text-white transition"
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
};

export default SidebarFooter;
