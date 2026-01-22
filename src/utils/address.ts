/**
 * Address utility functions for consistent address composition across the app.
 *
 * PRIMARY RULE:
 * - street_address and street_address_second are the ONLY "street lines"
 * - Never concatenate city/state/postal_code into street address
 * - Display format:
 *   Line 1: street_address (+ street_address_second if present)
 *   Line 2: city, state postal_code
 */

/**
 * Builds the street line(s) from address components.
 * Returns ONLY street information, never city/state/postal.
 *
 * @param streetAddress - Primary street address
 * @param streetAddressSecond - Optional second address line
 * @returns Street lines joined by ", " or undefined if no street data
 */
export const buildStreetAddress = (
  streetAddress?: string | null,
  streetAddressSecond?: string | null,
): string | undefined => {
  const parts = [streetAddress, streetAddressSecond]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .map((part) => part.trim());

  const joined = parts.join(", ");
  return joined.length > 0 ? joined : undefined;
};

/**
 * Builds the city/state/postal line for display.
 *
 * @param city - City name
 * @param state - State name or abbreviation
 * @param postalCode - Postal/ZIP code
 * @returns Formatted string like "City, State 12345" or undefined if no data
 */
export const buildCityStateZip = (
  city?: string | null,
  state?: string | null,
  postalCode?: string | null,
): string | undefined => {
  const cityState = [city, state]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .map((part) => part.trim())
    .join(", ");

  const parts = [cityState, postalCode]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .map((part) => part.trim());

  const joined = parts.join(" ");
  return joined.length > 0 ? joined : undefined;
};


/**
 * Builds a full address string for Google Maps queries.
 * Concatenates street + city/state/zip with appropriate separators.
 *
 * @param streetAddress - Primary street address
 * @param streetAddressSecond - Optional second address line
 * @param city - City name
 * @param state - State name or abbreviation
 * @param postalCode - Postal/ZIP code
 * @returns Full address string suitable for Google Maps API
 */
export const buildFullAddressForMaps = (
  streetAddress?: string | null,
  streetAddressSecond?: string | null,
  city?: string | null,
  state?: string | null,
  postalCode?: string | null,
): string => {
  const street = buildStreetAddress(streetAddress, streetAddressSecond);
  const cityStateZip = buildCityStateZip(city, state, postalCode);

  const parts = [street, cityStateZip].filter(Boolean);
  return parts.join(", ");
};
