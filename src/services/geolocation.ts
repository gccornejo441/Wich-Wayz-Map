import axios from "axios";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface AddressComponents {
  house_number?: string;
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

export default GetCoordinatesAndAddressDetails;
