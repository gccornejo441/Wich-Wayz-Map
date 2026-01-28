import axios from "axios";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface AddressComponents extends Record<string, unknown> {
  house_number?: string;
  street?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  state?: string;
  postcode?: string;
  country?: string;
  secondary_address?: string;
}

type UsStateCode =
  | "AL"
  | "AK"
  | "AZ"
  | "AR"
  | "CA"
  | "CO"
  | "CT"
  | "DE"
  | "FL"
  | "GA"
  | "HI"
  | "ID"
  | "IL"
  | "IN"
  | "IA"
  | "KS"
  | "KY"
  | "LA"
  | "ME"
  | "MD"
  | "MA"
  | "MI"
  | "MN"
  | "MS"
  | "MO"
  | "MT"
  | "NE"
  | "NV"
  | "NH"
  | "NJ"
  | "NM"
  | "NY"
  | "NC"
  | "ND"
  | "OH"
  | "OK"
  | "OR"
  | "PA"
  | "RI"
  | "SC"
  | "SD"
  | "TN"
  | "TX"
  | "UT"
  | "VT"
  | "VA"
  | "WA"
  | "WV"
  | "WI"
  | "WY"
  | "DC";

const US_STATE_NAMES_BY_CODE: Record<UsStateCode, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

const US_STATE_CODE_BY_NAME = Object.entries(US_STATE_NAMES_BY_CODE).reduce(
  (acc, [code, name]) => {
    acc[name.toLowerCase()] = code as UsStateCode;
    return acc;
  },
  {} as Record<string, UsStateCode>,
);

const isUsCountry = (country?: string, countryCode?: string): boolean => {
  const cc = (countryCode ?? "").trim().toUpperCase();
  if (cc === "US" || cc === "USA") return true;

  const c = (country ?? "").trim().toLowerCase();
  return (
    c === "united states" ||
    c === "united states of america" ||
    c === "usa" ||
    c === "us"
  );
};

const normalizeUsState = (
  state?: string,
  stateCode?: string,
): { code: UsStateCode; name: string } | null => {
  const sc = (stateCode ?? "").trim().toUpperCase();
  if (sc && sc in US_STATE_NAMES_BY_CODE) {
    const code = sc as UsStateCode;
    return { code, name: US_STATE_NAMES_BY_CODE[code] };
  }

  const s = (state ?? "").trim();
  if (!s) return null;

  const sUpper = s.toUpperCase();
  if (sUpper in US_STATE_NAMES_BY_CODE) {
    const code = sUpper as UsStateCode;
    return { code, name: US_STATE_NAMES_BY_CODE[code] };
  }

  const byName = US_STATE_CODE_BY_NAME[s.toLowerCase()];
  if (byName) return { code: byName, name: US_STATE_NAMES_BY_CODE[byName] };

  return null;
};

const enforceUsStateAddress = <T extends Record<string, unknown>>(
  components: T & {
    state?: string;
    country?: string;
    state_code?: string;
    country_code?: string;
  },
): (T & { state: string; country: string }) | null => {
  if (!isUsCountry(components.country, components.country_code)) return null;

  const normalized = normalizeUsState(components.state, components.state_code);
  if (!normalized) return null;

  return {
    ...components,
    state: normalized.code,
    country: "US",
  };
};

interface ParsedAddress {
  coordinates: Coordinates;
  components: AddressComponents;
}

/**
 * Get the coordinates and address details for a given address.
 * @param address The address to lookup.
 * @returns The parsed address details, or null if not found.
 */
async function GetCoordinatesAndAddressDetails(
  address: string,
): Promise<ParsedAddress | null> {
  try {
    const { data } = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: address,
          format: "json",
          addressdetails: 1,
          limit: 1,
          countrycodes: "us",
        },
      },
    );

    if (!Array.isArray(data) || data.length === 0) return null;

    const { lat, lon, address: rawComponents } = data[0];
    const coordinates: Coordinates = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
    };

    const components = rawComponents as AddressComponents & {
      country_code?: string;
    };
    const enforced = enforceUsStateAddress({
      ...components,
      country_code: components.country_code,
      state_code: undefined,
    });

    if (!enforced) return null;

    return { coordinates, components: enforced };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Perform a forward geocoding search using MapBox's geocoding API.
 *
 * @param searchText The search query to use for the geocoding search.
 * @param options An object with optional search parameters.
 * @returns A Promise that resolves to an object with the coordinates and address
 * components, or null if there was an error or no results were found.
 */
const MapBoxLocationLookup = async (
  searchText: string,
  options: {
    permanent?: boolean;
    proximity?: [number, number];
    types?: string;
    language?: string;
    limit?: number;
  } = {},
): Promise<ParsedAddress | null> => {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (!mapboxAccessToken) return null;

  try {
    const params: Record<string, string | boolean | number> = {
      q: searchText,
      access_token: mapboxAccessToken,
      permanent: options.permanent || false,
      country: "us",
      types: options.types || "address,secondary_address",
      limit: options.limit || 1,
    };

    if (options.proximity) params.proximity = options.proximity.join(",");
    if (options.language) params.language = options.language;

    const { data } = await axios.get(
      "https://api.mapbox.com/search/geocode/v6/forward",
      { params },
    );

    const result = data?.features?.[0];
    if (!result?.geometry?.coordinates) return null;

    const coordinates: Coordinates = {
      latitude: result.geometry.coordinates[1],
      longitude: result.geometry.coordinates[0],
    };

    const ctx = result.properties?.context;

    const parsedComponents: AddressComponents & {
      state_code?: string;
      country_code?: string;
    } = {} as AddressComponents & {
      state_code?: string;
      country_code?: string;
    };

    if (ctx?.secondary_address?.name)
      parsedComponents.secondary_address = ctx.secondary_address.name;
    if (ctx?.address?.address_number)
      parsedComponents.house_number = ctx.address.address_number;
    if (ctx?.address?.street_name)
      parsedComponents.street = ctx.address.street_name;
    if (ctx?.neighborhood?.name)
      parsedComponents.neighbourhood = ctx.neighborhood.name;
    if (ctx?.place?.name) parsedComponents.city = ctx.place.name;
    if (ctx?.region?.name) parsedComponents.state = ctx.region.name;
    if (ctx?.region?.region_code)
      parsedComponents.state_code = ctx.region.region_code;
    if (ctx?.postcode?.name) parsedComponents.postcode = ctx.postcode.name;
    if (ctx?.country?.name) parsedComponents.country = ctx.country.name;
    if (ctx?.country?.country_code)
      parsedComponents.country_code = ctx.country.country_code;

    const enforced = enforceUsStateAddress(parsedComponents);
    if (!enforced) return null;

    return { coordinates, components: enforced };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      console.error(`Error ${status}: ${data?.message || "Unknown error."}`);
    } else {
      console.error("Unexpected error:", (error as Error).message);
    }
    return null;
  }
};

/**
 * Perform a forward geocoding search with MapBox to get multiple address suggestions.
 *
 * @param searchText The search query to use for the geocoding search.
 * @param options An object with optional search parameters.
 * @returns A Promise that resolves to an array of parsed addresses.
 */
const MapBoxMultipleLocationLookup = async (
  searchText: string,
  options: {
    permanent?: boolean;
    proximity?: [number, number];
    types?: string;
    language?: string;
    limit?: number;
  } = {},
): Promise<ParsedAddress[]> => {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (!mapboxAccessToken) return [];

  try {
    const params: Record<string, string | boolean | number> = {
      q: searchText,
      access_token: mapboxAccessToken,
      permanent: options.permanent || false,
      country: "us",
      types: options.types || "address,secondary_address",
      limit: options.limit || 5,
    };

    if (options.proximity) params.proximity = options.proximity.join(",");
    if (options.language) params.language = options.language;

    const { data } = await axios.get(
      "https://api.mapbox.com/search/geocode/v6/forward",
      { params },
    );

    const features = data?.features;
    if (!Array.isArray(features) || features.length === 0) return [];

    const results: ParsedAddress[] = [];

    for (const f of features) {
      if (!f?.geometry?.coordinates) continue;

      const coordinates: Coordinates = {
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      };

      const ctx = f.properties?.context;
      const parsedComponents: AddressComponents & {
        state_code?: string;
        country_code?: string;
      } = {} as AddressComponents & {
        state_code?: string;
        country_code?: string;
      };

      if (ctx?.secondary_address?.name)
        parsedComponents.secondary_address = ctx.secondary_address.name;
      if (ctx?.address?.address_number)
        parsedComponents.house_number = ctx.address.address_number;
      if (ctx?.address?.street_name)
        parsedComponents.street = ctx.address.street_name;
      if (ctx?.place?.name) parsedComponents.city = ctx.place.name;
      if (ctx?.region?.name) parsedComponents.state = ctx.region.name;
      if (ctx?.region?.region_code)
        parsedComponents.state_code = ctx.region.region_code;
      if (ctx?.postcode?.name) parsedComponents.postcode = ctx.postcode.name;
      if (ctx?.country?.name) parsedComponents.country = ctx.country.name;
      if (ctx?.country?.country_code)
        parsedComponents.country_code = ctx.country.country_code;

      const enforced = enforceUsStateAddress(parsedComponents);
      if (!enforced) continue;

      results.push({ coordinates, components: enforced });
    }

    return results;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      console.error(`Error ${status}: ${data?.message || "Unknown error."}`);
    } else {
      console.error("Unexpected error:", (error as Error).message);
    }
    return [];
  }
};

export {
  GetCoordinatesAndAddressDetails,
  MapBoxLocationLookup,
  MapBoxMultipleLocationLookup,
};
