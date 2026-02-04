/**
 * Map Link Service
 * 
 * Centralized service for generating map URLs (Google Maps, Apple Maps, etc.)
 * Provides consistent URL generation across the application.
 */

export interface MapLinkOptions {
  latitude?: number;
  longitude?: number;
  address?: string;
  shopName?: string;
}

/**
 * Check if coordinates are valid
 */
const hasValidCoordinates = (
  latitude?: number,
  longitude?: number,
): boolean => {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0
  );
};

/**
 * Generate Google Maps search URL
 * Priority: coordinates > address search
 * 
 * @param options - Location details
 * @returns Google Maps search URL or empty string if no valid location
 */
export const generateGoogleMapsSearchUrl = (
  options: MapLinkOptions,
): string => {
  const { latitude, longitude, address, shopName } = options;

  // Priority 1: Use coordinates if available (most accurate)
  if (hasValidCoordinates(latitude, longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }

  // Priority 2: Fallback to text-based address search
  if (address && address.trim()) {
    const query = shopName
      ? `${shopName.trim()} ${address.trim()}`
      : address.trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  return "";
};

/**
 * Generate Google Maps directions URL
 * Priority: coordinates > address
 * 
 * @param options - Destination details
 * @returns Google Maps directions URL or empty string if no valid destination
 */
export const generateGoogleMapsDirectionsUrl = (
  options: MapLinkOptions,
): string => {
  const { latitude, longitude, address } = options;

  // Priority 1: Use coordinates if available (most accurate)
  if (hasValidCoordinates(latitude, longitude)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }

  // Priority 2: Fallback to address
  if (address && address.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`;
  }

  return "";
};

/**
 * Generate all map links for a location
 * Convenience function that returns both search and directions URLs
 * 
 * @param options - Location details
 * @returns Object containing searchUrl and directionsUrl
 */
export const generateMapLinks = (options: MapLinkOptions) => {
  return {
    searchUrl: generateGoogleMapsSearchUrl(options),
    directionsUrl: generateGoogleMapsDirectionsUrl(options),
  };
};

/**
 * Generate Apple Maps URL (for iOS users)
 * 
 * @param options - Location details
 * @returns Apple Maps URL or empty string if no valid location
 */
export const generateAppleMapsUrl = (options: MapLinkOptions): string => {
  const { latitude, longitude, address, shopName } = options;

  if (hasValidCoordinates(latitude, longitude)) {
    const label = shopName ? `&q=${encodeURIComponent(shopName)}` : "";
    return `https://maps.apple.com/?ll=${latitude},${longitude}${label}`;
  }

  if (address && address.trim()) {
    const query = shopName
      ? `${shopName.trim()} ${address.trim()}`
      : address.trim();
    return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
  }

  return "";
};

/**
 * Check if user is on iOS device
 */
export const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Get the preferred map URL based on user's platform
 * 
 * @param options - Location details
 * @returns URL for the preferred map provider
 */
export const getPreferredMapUrl = (options: MapLinkOptions): string => {
  return isIOSDevice()
    ? generateAppleMapsUrl(options)
    : generateGoogleMapsSearchUrl(options);
};