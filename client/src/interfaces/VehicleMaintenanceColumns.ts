// ============================================================
// STATUS
// ============================================================

export type MaintenanceStatus = "scheduled" | "completed" | "cancelled";

// Worked out by the API from the status and the dates.
// "overdue" = still scheduled but its end date has passed.
export type MaintenancePhase =
  | "upcoming"
  | "ongoing"
  | "overdue"
  | "completed"
  | "cancelled";

// ============================================================
// MAINTENANCE RECORD
// ============================================================

export interface MaintenanceVehicle {
  vehicle_id: number;
  vehicle_name: string;
  plate_number: string;
}

export interface VehicleMaintenanceColumns {
  maintenance_id: number;

  vehicle_id: number;
  vehicle?: MaintenanceVehicle;

  reason: string;
  notes: string | null;

  // Whole days, inclusive
  date_start: string; // YYYY-MM-DD
  date_end: string; // YYYY-MM-DD

  status: MaintenanceStatus;
  phase: MaintenancePhase;
  range_label: string; // "from Nov 20, 2026 to Nov 22, 2026"

  created_at: string;
  updated_at: string;
}

// ============================================================
// FORM DATA
// ============================================================

export interface VehicleMaintenanceFormData {
  vehicle_id: number;
  reason: string;
  notes?: string | null;
  date_start: string;
  date_end: string;
}

// The vehicle cannot be changed once a record exists
export type VehicleMaintenanceUpdateData = Omit<
  VehicleMaintenanceFormData,
  "vehicle_id"
>;

// ============================================================
// FILTERS
// ============================================================

export interface VehicleMaintenanceFilters {
  vehicle_id?: number;
  status?: MaintenanceStatus;
  upcoming?: boolean; // running now or still coming up
  date_from?: string;
  date_to?: string;
  search?: string;
}

// ============================================================
// API RESPONSES
// ============================================================

export interface VehicleMaintenanceResponse {
  message: string;
  data: VehicleMaintenanceColumns;
}

export interface VehicleMaintenanceListResponse {
  message: string;
  data: VehicleMaintenanceColumns[];
}

export interface VehicleMaintenanceMessageResponse {
  message: string;
}

// ============================================================
// FIELD ERRORS
// ============================================================

export interface MaintenanceFieldErrors {
  vehicle_id?: string[];
  reason?: string[];
  notes?: string[];
  date_start?: string[];
  date_end?: string[];
  status?: string[];
}
