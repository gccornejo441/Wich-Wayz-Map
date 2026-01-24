/**
 * Address type for Add/Edit Shop flow
 * Represents a structured address with optional coordinates
 * Maps to database schema: locations table (lines 23-40)
 * - streetAddress → street_address (TEXT NOT NULL)
 * - streetAddressSecond → street_address_second (TEXT nullable)
 * - postalCode → postal_code (TEXT NOT NULL)
 * - latitude → latitude (REAL NOT NULL)
 * - longitude → longitude (REAL NOT NULL)
 * - city → city (TEXT NOT NULL)
 * - state → state (TEXT NOT NULL)
 * - country → country (TEXT NOT NULL)
 */
export interface AddressDraft {
  streetAddress: string;
  streetAddressSecond: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Default empty address with USA as default country
 * State defaults to empty string per schema requirements (not auto-populated)
 */
export const emptyAddress: AddressDraft = {
  streetAddress: "",
  streetAddressSecond: "",
  city: "",
  state: "",
  postalCode: "",
  country: "USA",
  latitude: null,
  longitude: null,
};
