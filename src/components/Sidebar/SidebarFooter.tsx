import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useToast } from "../../context/toastContext";
import ThemeToggle from "../Utilites/ThemeToggle";

const CONTACT_EMAIL = "wich.wayz.map@gmail.com";

const linkBaseClasses =
  "text-xs text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-sm";

const SidebarFooter = () => {
  const { addToast } = useToast();

  const handleContactUsClick = async () => {
    if (!navigator.clipboard?.writeText) {
      addToast(`Email: ${CONTACT_EMAIL}`, "info");
      return;
    }

    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      addToast("Email copied to clipboard!", "success");
    } catch {
      addToast("Failed to copy email. Email: " + CONTACT_EMAIL, "error");
    }
  };

  return (
    <div className="mt-auto border-t border-white/15 px-4 py-4 text-xs text-white/70">
      <div className="flex items-center justify-between gap-2">
        <p>© 2026 Wich Wayz?</p>
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>

      <nav
        aria-label="Sidebar footer links"
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1"
      >
        <a
          href="https://en.wikipedia.org/wiki/Sandwich"
          target="_blank"
          rel="noopener noreferrer"
          className={linkBaseClasses}
        >
          About
        </a>

        <button
          type="button"
          onClick={handleContactUsClick}
          className={linkBaseClasses}
          aria-label="Copy contact email to clipboard"
        >
          Contact Us
        </button>

        <Link to={ROUTES.LEGAL.PRIVACY_POLICY} className={linkBaseClasses}>
          Privacy Policy
        </Link>

        <Link to={ROUTES.LEGAL.TERMS_OF_SERVICE} className={linkBaseClasses}>
          Terms of Service
        </Link>
      </nav>
    </div>
  );
};

export default SidebarFooter;
