/**
 * useRecaptcha Hook
 *
 * React hook for executing reCAPTCHA v3 challenges.
 * Provides a simple interface to get reCAPTCHA tokens for different actions.
 */

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

interface RecaptchaState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

let recaptchaLoadPromise: Promise<void> | null = null;

const waitForRecaptcha = (timeoutMs = 10000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const checkReady = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(resolve);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("reCAPTCHA failed to load"));
        return;
      }

      window.setTimeout(checkReady, 100);
    };

    checkReady();
  });
};

const loadRecaptchaScript = async (siteKey: string): Promise<void> => {
  if (!siteKey) {
    throw new Error("reCAPTCHA site key not configured");
  }

  if (window.grecaptcha) {
    await waitForRecaptcha();
    return;
  }

  if (recaptchaLoadPromise) {
    await recaptchaLoadPromise;
    return;
  }

  recaptchaLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src*="recaptcha/api.js"]`,
    );

    const script =
      existingScript ??
      Object.assign(document.createElement("script"), {
        src: `https://www.google.com/recaptcha/api.js?render=${siteKey}`,
        async: true,
        defer: true,
      });

    const timeout = window.setTimeout(() => {
      reject(new Error("reCAPTCHA failed to load"));
    }, 10000);

    const handleLoaded = () => {
      waitForRecaptcha()
        .then(() => {
          window.clearTimeout(timeout);
          resolve(undefined);
        })
        .catch((error: unknown) => {
          window.clearTimeout(timeout);
          reject(error);
        });
    };

    const handleError = () => {
      window.clearTimeout(timeout);
      reject(new Error("Failed to load reCAPTCHA script"));
    };

    script.addEventListener("load", handleLoaded, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (existingScript) {
      void waitForRecaptcha().then(handleLoaded).catch(handleError);
      return;
    }

    document.head.appendChild(script);
  }).catch((error: unknown) => {
    recaptchaLoadPromise = null;
    throw error;
  });

  await recaptchaLoadPromise;
};

/**
 * Hook to use reCAPTCHA v3 in React components.
 *
 * @returns {Object} reCAPTCHA utilities
 * @returns {Function} executeRecaptcha - Function to execute reCAPTCHA challenge
 * @returns {boolean} isReady - Whether reCAPTCHA is loaded and ready
 * @returns {boolean} isLoading - Whether reCAPTCHA is currently loading
 * @returns {string|null} error - Error message if reCAPTCHA failed to load
 */
export const useRecaptcha = () => {
  const [state, setState] = useState<RecaptchaState>({
    isReady: false,
    isLoading: true,
    error: null,
  });

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    let isMounted = true;

    loadRecaptchaScript(siteKey)
      .then(() => {
        if (!isMounted) return;
        setState({
          isReady: true,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setState({
          isReady: false,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to load reCAPTCHA",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [siteKey]);

  /**
   * Execute a reCAPTCHA challenge for a specific action.
   *
   * @param {string} action - The action name (e.g., 'register', 'login', 'vote')
   * @returns {Promise<string>} The reCAPTCHA token
   * @throws {Error} If reCAPTCHA is not ready or execution fails
   */
  const executeRecaptcha = useCallback(
    async (action: string): Promise<string> => {
      await loadRecaptchaScript(siteKey);

      const grecaptcha = window.grecaptcha;
      if (!grecaptcha) {
        throw new Error("reCAPTCHA not loaded");
      }

      try {
        return await grecaptcha.execute(siteKey, { action });
      } catch (error) {
        console.error("reCAPTCHA execution failed:", error);
        throw new Error("Failed to verify. Please try again.");
      }
    },
    [siteKey],
  );

  return {
    executeRecaptcha,
    isReady: state.isReady,
    isLoading: state.isLoading,
    error: state.error,
  };
};

/**
 * Simple wrapper hook that just executes reCAPTCHA without state management.
 * Useful for one-off executions.
 *
 * @returns {Function} Function to execute reCAPTCHA
 */
export const useRecaptchaExecute = () => {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  return useCallback(
    async (action: string): Promise<string> => {
      await loadRecaptchaScript(siteKey);

      const grecaptcha = window.grecaptcha;
      if (!grecaptcha) {
        throw new Error("reCAPTCHA not loaded");
      }

      return grecaptcha.execute(siteKey, { action });
    },
    [siteKey],
  );
};
