/**
 * useRecaptcha Hook
 *
 * React hook for executing reCAPTCHA v3 challenges.
 * Provides a simple interface to get reCAPTCHA tokens for different actions.
 */

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    grecaptcha: {
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
    if (!siteKey) {
      setState({
        isReady: false,
        isLoading: false,
        error: "reCAPTCHA site key not configured",
      });
      return;
    }

    // Check if reCAPTCHA is already loaded
    if (window.grecaptcha) {
      window.grecaptcha.ready(() => {
        setState({
          isReady: true,
          isLoading: false,
          error: null,
        });
      });
      return;
    }

    // Load reCAPTCHA script if not already loaded
    const existingScript = document.querySelector(
      `script[src*="recaptcha/api.js"]`,
    );

    if (existingScript) {
      // Script is loading, wait for it
      const checkReady = setInterval(() => {
        if (window.grecaptcha) {
          clearInterval(checkReady);
          window.grecaptcha.ready(() => {
            setState({
              isReady: true,
              isLoading: false,
              error: null,
            });
          });
        }
      }, 100);

      return () => clearInterval(checkReady);
    }

    // Load the script
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setState({
            isReady: true,
            isLoading: false,
            error: null,
          });
        });
      } else {
        setState({
          isReady: false,
          isLoading: false,
          error: "Failed to load reCAPTCHA",
        });
      }
    };

    script.onerror = () => {
      setState({
        isReady: false,
        isLoading: false,
        error: "Failed to load reCAPTCHA script",
      });
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script on unmount (optional)
      // Note: You might want to keep the script loaded for the entire session
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
      if (!siteKey) {
        throw new Error("reCAPTCHA site key not configured");
      }

      if (!state.isReady) {
        throw new Error("reCAPTCHA not ready. Please wait.");
      }

      if (!window.grecaptcha) {
        throw new Error("reCAPTCHA not loaded");
      }

      try {
        const token = await window.grecaptcha.execute(siteKey, { action });
        return token;
      } catch (error) {
        console.error("reCAPTCHA execution failed:", error);
        throw new Error("Failed to verify. Please try again.");
      }
    },
    [siteKey, state.isReady],
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
      if (!siteKey) {
        throw new Error("reCAPTCHA site key not configured");
      }

      return new Promise((resolve, reject) => {
        if (!window.grecaptcha) {
          reject(new Error("reCAPTCHA not loaded"));
          return;
        }

        window.grecaptcha.ready(async () => {
          try {
            const token = await window.grecaptcha.execute(siteKey, { action });
            resolve(token);
          } catch (error) {
            reject(error);
          }
        });
      });
    },
    [siteKey],
  );
};
