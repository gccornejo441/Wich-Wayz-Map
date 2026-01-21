export interface Shop {
  id?: number;
  name: string;
  description?: string | null;
  created_by: number;
  modified_by?: number | null;
  date_created?: string;
  date_modified?: string | null;
  id_location?: number;
  address?: string | null;
  latitude?: number;
  longitude?: number;
}
