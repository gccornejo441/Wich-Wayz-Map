import axios, { AxiosError } from "axios";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface AddressComponents {
  house_number?: string;
  street?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface ParsedAddress {
  coordinates: Coordinates;
  components: AddressComponents;
}

interface MapBoxContextItem {
  id: string;
  text: string;
}

/**
 * Perform a forward geocoding search using OpenStreetMap's Nominatim API.
 *
 * @param {string} address The search query to use for the geocoding search.
 *
 * 
 * @returns {Promise<ParsedAddress | null>} The coordinates and address components parsed from the search result, or null if there was an error or no results were found.
 */
async function GetCoordinatesAndAddressDetails(
  address: string
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
        },
      }
    );

    if (Array.isArray(data) && data.length > 0) {
      const { lat, lon, address: components } = data[0];
      const coordinates: Coordinates = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      };

      return { coordinates, components };
    } else {
      console.warn("No results found for the provided address.");
      return null;
    }
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
 * @param options.permanent Whether to use permanent geocoding results.
 * @param options.proximity A latitude and longitude pair to bias the results.
 * @param options.types A comma-separated list of result types to search for.
 * @param options.country A country code to limit the search to.
 * @param options.language A language code to use for the search results.
 * @param options.limit The maximum number of results to return.
 *
 * @returns A Promise that resolves to an object with the coordinates and address
 * components, or null if there was an error or no results were found.
 */
const MapBoxLocationLookup = async (
  searchText: string,
  options: {
    permanent?: boolean;
    proximity?: [number, number];
    types?: string;
    country?: string;
    language?: string;
    limit?: number;
  } = {}
): Promise<ParsedAddress | null> => {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  if (!mapboxAccessToken) {
    console.error("Missing MapBox access token.");
    return null;
  }

  try {
    const params: Record<string, string | boolean | number> = {
      q: searchText,
      access_token: mapboxAccessToken,
      permanent: options.permanent || false,
    };

    if (options.proximity) {
      params.proximity = options.proximity.join(",");
    }
    if (options.types) {
      params.types = options.types;
    }
    if (options.country) {
      params.country = options.country;
    }
    if (options.language) {
      params.language = options.language;
    }
    if (options.limit) {
      params.limit = options.limit;
    }

    const { data } = await axios.get(
      "https://api.mapbox.com/search/geocode/v6/forward",
      { params }
    );

    if (data?.results?.length > 0) {
      const result = data.results[0];
      if (!result.geometry || !result.geometry.coordinates) {
        console.error("Invalid geometry in geocoding result.");
        return null;
      }

      const coordinates: Coordinates = {
        latitude: result.geometry.coordinates[1],
        longitude: result.geometry.coordinates[0],
      };

      const parsedComponents: AddressComponents = result.context?.reduce(
        (acc: AddressComponents, item: MapBoxContextItem) => {
          const { id, text } = item;
          if (id.includes("address")) acc.house_number = text;
          if (id.includes("street")) acc.street = text;
          if (id.includes("neighbourhood")) acc.neighbourhood = text;
          if (id.includes("locality")) acc.suburb = text;
          if (id.includes("place")) acc.city = text;
          if (id.includes("region")) acc.state = text;
          if (id.includes("postcode")) acc.postcode = text;
          if (id.includes("country")) acc.country = text;
          return acc;
        },
        {} as AddressComponents
      );

      return { coordinates, components: parsedComponents };
    } else {
      console.warn("No results found for the provided search text.");
      return null;
    }
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 401:
          console.error("Unauthorized: Invalid or missing access token.");
          break;
        case 403:
          console.error(
            "Forbidden: Check your account settings or token restrictions."
          );
          break;
        case 404:
          console.error(
            "Not Found: Check the endpoint or query parameters for correctness."
          );
          break;
        case 422:
          console.error(
            `Unprocessable Entity: ${data.message || "Invalid request parameters."}`
          );
          break;
        case 429:
          console.error(
            "Rate limit exceeded: Check your account for rate limit details."
          );
          break;
        default:
          console.error(`Error ${status}: ${data.message || "Unknown error."}`);
      }
    } else {
      console.error("Unexpected error:", (error as Error).message);
    }
    return null;
  }
};

export { GetCoordinatesAndAddressDetails, MapBoxLocationLookup };
