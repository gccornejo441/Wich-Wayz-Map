import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ROUTES } from "@constants/routes";
import { MODAL_VERSION, DEFAULT_SNOOZE_DAYS } from "./constants";
import { storageKeyFor, readState, writeState } from "./storage";
import { getLocale } from "./locale";
import { isEligible } from "./eligibility";
import { track } from "./track";
import type { OnboardingState } from "./types";

interface UseOnboardingModalProps {
  mapReady?: boolean;
  isAuthenticated: boolean;
  userKey: string;
  currentModalOpen: boolean;
}

interface UseOnboardingModalReturn {
  open: boolean;
  setOpen: (open: boolean) => void;
  handleClosePrimary: () => void;
  handleClose: (dismissMethod: "close" | "esc" | "outside") => void;
  handleSnooze: () => void;
  handleContribute: () => void;
  handleTermsClick: () => void;
}

const isFeatureEnabled = (): boolean => {
  return import.meta.env.VITE_ONBOARDING_MODAL === "on";
};

export const useOnboardingModal = ({
  mapReady,
  isAuthenticated,
  userKey,
  currentModalOpen,
}: UseOnboardingModalProps): UseOnboardingModalReturn => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const hasTriggeredRef = useRef(false);

  const storageKey = useMemo(() => storageKeyFor(userKey), [userKey]);
  const locale = useMemo(getLocale, []);
  const state = useMemo(() => readState(storageKey), [storageKey]);

  const eligible = useMemo(() => {
    const now = Date.now();
    return isEligible(state, now, MODAL_VERSION);
  }, [state]);

  const shouldShow = useMemo(() => {
    if (!isFeatureEnabled()) return false;
    if (location.pathname !== ROUTES.HOME) return false;
    if (currentModalOpen) return false;
    if (!eligible) return false;
    return true;
  }, [location.pathname, currentModalOpen, eligible]);

  useEffect(() => {
    if (!shouldShow || hasTriggeredRef.current) return;

    let cancelled = false;

    const show = () => {
      if (cancelled || hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      setOpen(true);
      track("onboarding_impression", {
        version: MODAL_VERSION,
        locale,
        isAuthenticated,
        route: location.pathname,
        timestamp: Date.now(),
      });
    };

    if (mapReady !== undefined) {
      if (mapReady) {
        const timeoutId = window.setTimeout(show, 800);
        return () => {
          cancelled = true;
          window.clearTimeout(timeoutId);
        };
      }
      return;
    }

    type RequestIdleCallback = (
      callback: () => void,
      options?: { timeout: number },
    ) => number;
    type CancelIdleCallback = (id: number) => void;

    const idle = (
      window as unknown as { requestIdleCallback?: RequestIdleCallback }
    ).requestIdleCallback;

    if (typeof idle === "function") {
      const idleId = idle(show, { timeout: 2000 });
      return () => {
        cancelled = true;
        const cancel = (
          window as unknown as { cancelIdleCallback?: CancelIdleCallback }
        ).cancelIdleCallback;
        if (cancel) {
          cancel(idleId);
        }
      };
    }

    const timeoutId = window.setTimeout(show, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [shouldShow, mapReady, locale, isAuthenticated, location.pathname]);

  const persistSeen = (partial?: Partial<OnboardingState>) => {
    writeState(storageKey, {
      version: MODAL_VERSION,
      seen: true,
      dismissedAt: Date.now(),
      locale,
      ...partial,
    });
  };

  const handleClosePrimary = () => {
    persistSeen();
    setOpen(false);
    track("onboarding_dismiss", {
      version: MODAL_VERSION,
      locale,
      isAuthenticated,
      route: location.pathname,
      timestamp: Date.now(),
      dismissMethod: "primary",
    });
  };

  const handleClose = (dismissMethod: "close" | "esc" | "outside") => {
    persistSeen();
    setOpen(false);
    track("onboarding_dismiss", {
      version: MODAL_VERSION,
      locale,
      isAuthenticated,
      route: location.pathname,
      timestamp: Date.now(),
      dismissMethod,
    });
  };

  const handleSnooze = () => {
    writeState(storageKey, {
      version: MODAL_VERSION,
      seen: false,
      snoozeUntil: Date.now() + DEFAULT_SNOOZE_DAYS * 24 * 60 * 60 * 1000,
      locale,
    });
    setOpen(false);
    track("onboarding_snooze", {
      version: MODAL_VERSION,
      locale,
      isAuthenticated,
      route: location.pathname,
      timestamp: Date.now(),
      snoozeDays: DEFAULT_SNOOZE_DAYS,
    });
  };

  const handleContribute = () => {
    persistSeen();
    track("onboarding_cta_contribute", {
      version: MODAL_VERSION,
      locale,
      isAuthenticated,
      route: location.pathname,
      timestamp: Date.now(),
      destination: ROUTES.SHOPS.ADD,
    });
  };

  const handleTermsClick = () => {
    track("onboarding_link_terms", {
      version: MODAL_VERSION,
      locale,
      isAuthenticated,
      route: location.pathname,
      timestamp: Date.now(),
      destination: ROUTES.LEGAL.TERMS_OF_SERVICE,
    });
  };

  return {
    open,
    setOpen,
    handleClosePrimary,
    handleClose,
    handleSnooze,
    handleContribute,
    handleTermsClick,
  };
};
