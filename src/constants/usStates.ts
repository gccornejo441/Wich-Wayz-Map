/**
 * US States and Territories
 * Structured as array of objects with full name and 2-letter code
 * Used for state dropdown selector in ShopForm
 */

export interface USState {
  code: string;
  name: string;
}

export const US_STATES: readonly USState[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
] as const;

/**
 * Helper function to get state code from full state name
 * Returns the 2-letter code if found, otherwise returns the input unchanged
 * Case-insensitive comparison
 */
export const getStateCode = (stateName: string): string => {
  if (!stateName) return "";

  // If already a 2-letter code, return it uppercase
  if (stateName.length === 2) {
    return stateName.toUpperCase();
  }

  // Search for matching state name
  const state = US_STATES.find(
    (s) => s.name.toLowerCase() === stateName.toLowerCase(),
  );

  return state ? state.code : stateName;
};

/**
 * Helper function to get full state name from 2-letter code
 * Returns the full name if found, otherwise returns the input unchanged
 * Case-insensitive comparison
 */
export const getStateName = (stateCode: string): string => {
  if (!stateCode) return "";

  const state = US_STATES.find(
    (s) => s.code.toLowerCase() === stateCode.toLowerCase(),
  );

  return state ? state.name : stateCode;
};
