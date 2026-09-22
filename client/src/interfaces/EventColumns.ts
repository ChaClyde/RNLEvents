import type { VenueColumns } from "./VenueColumns";
import type { OfficeColumns } from "./OfficeColumns";

export interface EventColumns {
  event_id: number;
  purpose: string;
  venue_id: number;
  venue: VenueColumns;
  time_start: string;
  time_end: string;
  date_start: string;
  date_end: string;
  number_of_days: number;
  chairs: number;
  lights_and_sounds: boolean;
  piano: boolean;
  multimedia_projector: boolean;
  hvls_electric_fan: boolean;
  others_specify: string | null;
  others_quantity: number | null;
  requested_by: string;
  office_id: number;
  office: OfficeColumns;
  email: string;
  tel_number: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventFieldErrors {
  purpose?: string[];
  venue_id?: string[];
  time_start?: string[];
  time_end?: string[];
  date_start?: string[];
  date_end?: string[];
  chairs?: string[];
  lights_and_sounds?: string[];
  piano?: string[];
  multimedia_projector?: string[];
  hvls_electric_fan?: string[];
  others_specify?: string[];
  others_quantity?: string[];
  requested_by?: string[];
  office_id?: string[];
  email?: string[];
  tel_number?: string[];
}
