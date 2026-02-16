import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { HiX, HiExclamationCircle, HiPlus } from "react-icons/hi";
import { ROUTES } from "@constants/routes";
import { useAuth } from "@context/authContext";
import { useModal } from "@context/modalContext";
import { useMap } from "@context/mapContext";
import { useOnboardingModal } from "./useOnboardingModal";

const getFocusable = (root: HTMLElement): HTMLElement[] => {
  const selectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
  return Array.from(root.querySelectorAll<HTMLElement>(selectors)).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
  );
};

const useFocusTrap = (
  enabled: boolean,
  dialogRef: React.RefObject<HTMLDivElement>,
) => {
  useEffect(() => {
    if (!enabled) return;
    const dialogEl = dialogRef.current;
    if (!dialogEl) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusables = getFocusable(dialogEl);
      if (focusables.length === 0) {
        e.preventDefault();
        dialogEl.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, dialogRef]);
};

export const OnboardingModal = () => {
  const { userMetadata, isAuthenticated } = useAuth();
  const { openLoginModal, currentModal } = useModal();
  const { mapReady } = useMap();
  const navigate = useNavigate();

  const userKey = userMetadata?.id ? String(userMetadata.id) : "anon";

  const {
    open,
    setOpen,
    handleClosePrimary,
    handleClose,
    handleSnooze,
    handleContribute,
    handleTermsClick,
  } = useOnboardingModal({
    mapReady,
    isAuthenticated,
    userKey,
    currentModalOpen: currentModal !== null,
  });

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;

    const appRoot = document.getElementById("root");
    if (appRoot) appRoot.setAttribute("inert", "");

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = window.setTimeout(() => {
      previouslyFocusedRef.current =
        document.activeElement as HTMLElement | null;
      if (closeBtnRef.current) closeBtnRef.current.focus();
      else if (dialogRef.current) dialogRef.current.focus();
    }, 50);

    return () => {
      window.clearTimeout(t);
      if (appRoot) appRoot.removeAttribute("inert");
      document.body.style.overflow = prevOverflow;

      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === "function") {
        prev.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose("esc");
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleClose]);

  const onContributeClick = () => {
    handleContribute();
    setOpen(false);

    if (!isAuthenticated) {
      openLoginModal();
      return;
    }

    navigate(ROUTES.SHOPS.ADD);
  };

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose("outside");
        }
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wichwayz-onboarding-title"
        aria-describedby="wichwayz-onboarding-desc"
        tabIndex={-1}
        className="relative w-full max-w-lg bg-surface-darker text-text-inverted rounded-xl shadow-2xl border border-white/10 animate-modalEnter"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="wichwayz-onboarding-title"
                className="text-xl font-poppins font-bold"
              >
                Welcome to Wich Wayz
              </h2>
              <p
                id="wichwayz-onboarding-desc"
                className="mt-1 text-sm text-white/70"
              >
                Discover sandwich shops on the map — and help improve it.
                Listings are community-updated, so some details may be missing
                or outdated.
              </p>
            </div>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => handleClose("close")}
              aria-label="Close welcome dialog"
              className="shrink-0 rounded-lg p-2 text-white/80 hover:bg-white/10 transition-colors"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex gap-3">
              <div
                className="h-9 w-9 rounded-full bg-brand-secondary/15 text-brand-secondary flex items-center justify-center"
                aria-hidden="true"
              >
                <HiExclamationCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  Coverage is still growing
                </div>
                <div className="text-xs text-white/70">
                  If a shop isn’t here yet, it just hasn’t been added.
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div
                className="h-9 w-9 rounded-full bg-brand-primary/15 text-brand-primary flex items-center justify-center"
                aria-hidden="true"
              >
                <HiPlus className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-semibold">Make the map better</div>
                <div className="text-xs text-white/70">
                  Add a shop or fix details so others can find it fast.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-white/60">
            By continuing, you agree to the{" "}
            <Link
              to={ROUTES.LEGAL.TERMS_OF_SERVICE}
              className="text-brand-secondary underline hover:text-brand-secondary/80"
              onClick={handleTermsClick}
            >
              Terms of Service
            </Link>
            .
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={handleClosePrimary}
              className="w-full rounded-lg bg-brand-primary text-white font-semibold py-3 hover:bg-brand-primary/90 transition-colors"
            >
              Find shops near me
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onContributeClick}
                className="flex-1 rounded-lg bg-surface-dark text-white py-2 text-sm hover:bg-white/10 transition-colors"
              >
                Add a shop
              </button>
              <button
                type="button"
                onClick={handleSnooze}
                className="flex-1 rounded-lg bg-surface-dark text-white py-2 text-sm hover:bg-white/10 transition-colors"
              >
                Remind me later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
