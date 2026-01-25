export interface Location {
  id?: number;
  postal_code: string;
  latitude: number;
  longitude: number;
  modified_by?: number | null;
  date_created?: string;
  date_modified?: string;
  street_address: string;
  street_address_second?: string | null;
  city: string;
  state: string;
  country: string;
  locationStatus?: "open" | "temporarily_closed" | "permanently_closed";
  phone?: string | null;
  website?: string | null;
  website_url?: string | null;
}
