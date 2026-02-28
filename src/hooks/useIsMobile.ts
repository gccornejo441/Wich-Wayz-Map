import { useState, useEffect } from "react";

/**
 * Custom hook to detect if the viewport is mobile-sized (< 768px)
 * @returns {boolean} true if viewport width is less than 768px
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    // Only run on client-side
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");

    // Handler for media query changes
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    handleChange(mediaQuery);

    // Add listener for changes
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup listener on unmount
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobile;
};
