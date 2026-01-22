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
  location_open?: boolean;
  phone?: string | null;
  website?: string | null; // For backward compatibility
  website_url?: string | null; // Canonical field matching DB schema
}
