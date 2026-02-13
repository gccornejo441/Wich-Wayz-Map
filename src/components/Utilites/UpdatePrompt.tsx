import { useEffect, useMemo, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface UpdatePromptProps {
  /**
   * Optional guard function to prevent updates during unsafe operations.
   * Return false to block the update prompt from showing.
   * Example: () => !isFormDirty || !isEditingShop
   */
  canUpdate?: () => boolean;
}

/**
 * UpdatePrompt Component
 *
 * Displays an "Update Available" banner when a new service worker is waiting.
 * User can click "Update" to activate the new version and reload, or "Later" to dismiss.
 *
 * Features:
 * - Checks for updates every hour
 * - Optional canUpdate guard to prevent updates during critical operations
 * - Non-intrusive banner at bottom center
 * - Dark mode support
 */
export function UpdatePrompt({ canUpdate }: UpdatePromptProps) {
  const [visible, setVisible] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(
      _swUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) {
      if (!registration) return;

      // Check for updates every hour
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000,
      );
    },
    onRegisterError(error: Error) {
      console.error("SW registration error:", error);
    },
  });

  // Determine if we should show the prompt
  const shouldShow = useMemo(() => {
    if (!needRefresh) return false;
    if (!canUpdate) return true;
    return canUpdate();
  }, [needRefresh, canUpdate]);

  useEffect(() => {
    setVisible(shouldShow);
  }, [shouldShow]);

  const handleUpdate = () => {
    setVisible(false);
    // skipWaiting is called by the SW, then the page reloads
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[99999] -translate-x-1/2 transform"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          New version available
        </div>
        <button
          type="button"
          className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          onClick={handleUpdate}
        >
          Update
        </button>
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:text-gray-200 dark:hover:bg-gray-800"
          onClick={handleDismiss}
        >
          Later
        </button>
      </div>
    </div>
  );
}
