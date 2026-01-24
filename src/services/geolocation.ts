import axios from "axios";

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
  // county?: string; // NOT IN DATABASE SCHEMA - commented out for compliance
  state?: string;
  postcode?: string;
  country?: string;
  secondary_address?: string;
}

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
        },
      },
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
  } = {},
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
      { params },
    );

    if (data?.features?.length > 0) {
      const result = data.features[0];
      if (!result.geometry?.coordinates) {
        console.error("Invalid geometry in geocoding result.");
        return null;
      }

      const coordinates: Coordinates = {
        latitude: result.geometry.coordinates[1],
        longitude: result.geometry.coordinates[0],
      };

      const context = result.properties?.context;

      const parsedComponents: AddressComponents = {};
      if (context) {
        if (context.secondary_address?.name) {
          parsedComponents.secondary_address = context.secondary_address.name;
        }
        if (context.address?.address_number) {
          parsedComponents.house_number = context.address.address_number;
        }
        if (context.address?.street_name) {
          parsedComponents.street = context.address.street_name;
        }
        if (context.neighborhood?.name) {
          parsedComponents.neighbourhood = context.neighborhood.name;
        }
        if (context.place?.name) {
          parsedComponents.city = context.place.name;
        }
        if (context.region?.name) {
          parsedComponents.state = context.region.name;
        }
        if (context.postcode?.name) {
          parsedComponents.postcode = context.postcode.name;
        }
        if (context.country?.name) {
          parsedComponents.country = context.country.name;
        }
      }

      return { coordinates, components: parsedComponents };
    } else {
      console.warn("No results found for the provided search text.");
      return null;
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      console.error(`Error ${status}: ${data.message || "Unknown error."}`);
    } else {
      console.error("Unexpected error:", (error as Error).message);
    }
    return null;
  }
};

export { GetCoordinatesAndAddressDetails, MapBoxLocationLookup };
