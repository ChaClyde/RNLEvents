// ============================================================
// STATUS
// ============================================================

export type DriverStatus =
  | "Available"
  | "On Leave"
  | "Sick Leave"
  | "Unavailable";

export const DRIVER_STATUSES: DriverStatus[] = [
  "Available",
  "On Leave",
  "Sick Leave",
  "Unavailable",
];

// ============================================================
// DRIVER
// ============================================================

export interface DriverColumns {
  driver_id: number;

  // Profile
  driver_name: string;
  contact_number: string | null;
  email: string | null;
  license_expiry: string | null;

  // Availability
  driver_status: DriverStatus;
  status_remarks: string | null;
  status_start_date: string | null; // YYYY-MM-DD
  status_end_date: string | null; // YYYY-MM-DD

  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// FORM DATA
// ============================================================

export interface DriverFormData {
  driver_name: string;
  contact_number?: string | null;
  email?: string | null;
  license_expiry?: string | null;

  driver_status?: DriverStatus;
  status_remarks?: string | null;
  status_start_date?: string | null;
  status_end_date?: string | null;
}

// ============================================================
// FILTERS
// ============================================================

export interface DriverFilters {
  // Only drivers who can be assigned on this date (YYYY-MM-DD)
  available_on?: string;
}

// ============================================================
// API RESPONSES
// ============================================================

export interface DriverResponse {
  message: string;
  data: DriverColumns;
}

export interface DriverListResponse {
  message: string;
  data: DriverColumns[];
}

export interface DriverMessageResponse {
  message: string;
}

// ============================================================
// FIELD ERRORS
// ============================================================

export interface DriverFieldErrors {
  driver_name?: string[];
  contact_number?: string[];
  email?: string[];
  license_expiry?: string[];
  driver_status?: string[];
  status_remarks?: string[];
  status_start_date?: string[];
  status_end_date?: string[];
}
