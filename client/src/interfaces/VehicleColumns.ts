import type { VehicleMaintenanceColumns } from "./VehicleMaintenanceColumns";

// ============================================================
// STATUS
// ============================================================

// What is saved: a manual on/off switch
export type VehicleStatus = "available" | "unavailable" | "maintenance";

// What is shown: the manual switch combined with the maintenance sheet
export type VehicleAvailabilityStatus = VehicleStatus | "maintenance";

// ============================================================
// VEHICLE
// ============================================================

export interface VehicleColumns {
  vehicle_id: number;

  // Basic Information
  vehicle_name: string;
  plate_number: string;
  vehicle_type: string | null;
  description: string | null;

  // Seating
  capacity: number;
  seating_notes: string | null; // e.g. "Front seats only"

  // Person in Charge
  person_in_charge: string | null;
  pic_contact_number: string | null;
  pic_email: string | null;

  // Availability (manual switch)
  status: VehicleStatus;

  // Availability (computed by the API on the vehicle list and detail
  // endpoints; not included in the Trash Bin list)
  availability_status?: VehicleAvailabilityStatus;
  availability_message?: string | null; // ready to show to users
  current_maintenance?: VehicleMaintenanceColumns | null;
  next_maintenance?: VehicleMaintenanceColumns | null;

  // Image
  image_path: string | null;
  image_url: string | null; // use this for <img src>

  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// API RESPONSES
// ============================================================

export interface VehicleResponse {
  message: string;
  data: VehicleColumns;
}

export interface VehicleListResponse {
  message: string;
  data: VehicleColumns[];
}

export interface VehicleMessageResponse {
  message: string;
}

// ============================================================
// FIELD ERRORS
// ============================================================

export interface VehicleFieldErrors {
  image_path?: string[];
  vehicle_name?: string[];
  plate_number?: string[];
  vehicle_type?: string[];
  description?: string[];
  capacity?: string[];
  seating_notes?: string[];
  person_in_charge?: string[];
  pic_contact_number?: string[];
  pic_email?: string[];
  status?: string[];
}
