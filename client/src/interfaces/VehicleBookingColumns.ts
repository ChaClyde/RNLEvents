// ============================================================
// STATUS AND STAGES
// ============================================================

export type VehicleBookingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type VehicleBookingStatusChange = Exclude<
  VehicleBookingStatus,
  "pending"
>;

export type VehicleApprovalStage =
  | "office_head"
  | "vehicle_approval"
  | "vehicle_admin"
  | "oic_budget"
  | "super_admin";

// ============================================================
// RELATED RECORDS
// ============================================================

export interface VehicleBookingOffice {
  office_id: number;
  office_name: string;
  office_code?: string | null;
  status?: string;
  is_deleted?: boolean;
}

export interface VehicleBookingVehicle {
  vehicle_id: number;
  vehicle_name?: string;
  plate_number?: string;
  vehicle_type?: string | null;
  description?: string | null;
  capacity?: number;
  seating_notes?: string | null;
  person_in_charge?: string | null;
  pic_contact_number?: string | null;
  pic_email?: string | null;
  status?: string;
  availability_status?: string;
  availability_message?: string | null;
  current_maintenance?: {
    reason?: string | null;
    date_start?: string | null;
    date_end?: string | null;
    range_label?: string | null;
  } | null;
  next_maintenance?: {
    reason?: string | null;
    date_start?: string | null;
    date_end?: string | null;
    range_label?: string | null;
  } | null;
  image_path?: string | null;
  image_url?: string | null;
  updated_at?: string;
}

export interface VehicleBookingDriver {
  driver_id: number;
  driver_name?: string;
  contact_number?: string | null;
  email?: string | null;
  driver_status?: string;
  status_remarks?: string | null;
  status_start_date?: string | null;
  status_end_date?: string | null;
  image_path?: string | null;
  image_url?: string | null;
}

export interface VehicleBookingUser {
  user_id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface VehicleBookingApproval {
  vehicle_booking_approval_id: number;
  vehicle_booking_id: number;
  approver_user_id: number;
  approval_stage: string;
  action: "approved" | "rejected";
  remarks: string | null;
  created_at: string;
  approver?: VehicleBookingUser | null;
}

// ============================================================
// VEHICLE BOOKING
// ============================================================

export interface VehicleBooking {
  vehicle_booking_id: number;

  // Requestor
  requested_by_user_id?: number | null;
  requester?: VehicleBookingUser | null;
  office_id: number;
  office?: VehicleBookingOffice | null;
  requested_by: string;
  email: string;
  tel_number: string;

  // Trip
  destination: string;
  purpose: string;
  remarks: string | null;

  // Schedule
  travel_date: string; // YYYY-MM-DD
  departure_time: string; // HH:MM:SS
  expected_return_date: string;
  expected_return_time: string;

  // Passengers
  passenger_count: number;
  passenger_details: string | null;

  charge_area?: string | null;
  driver_meal_rate?: number | string | null;
  meal_count?: number | null;
  driver_meal_amount?: number | string | null;
  charge_lines?: {
    id: string;
    label: string;
    detail?: string;
    quantity: number;
    unit_amount: number;
    removable: boolean;
    meal_rate?: number;
    day_count?: number;
    meal_breakdown?: { name: string; days: number }[];
    added_by_name?: string | null;
    added_at?: string | null;
  }[] | null;
  charge_total?: number | string | null;
  calculation_confirmed_at?: string | null;
  calculation_confirmed_stage?: string | null;
  requester_signer_name?: string | null;

  // Vehicle and driver
  vehicle_id: number | null;
  vehicle?: VehicleBookingVehicle | null;
  driver_id: number | null;
  driver?: VehicleBookingDriver | null;

  // Status and approval
  status: VehicleBookingStatus;
  approval_stage: VehicleApprovalStage | string;
  approval_remarks: string | null;
  cancellation_reason: string | null;
  approvals?: VehicleBookingApproval[];
  attachments?: {
    attachment_id: number;
    original_filename: string;
    mime_type?: string;
  }[];

  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// FORMS AND REQUESTS
// ============================================================

export interface VehicleBookingFormData {
  requested_by: string;
  email: string;
  tel_number: string;
  office_id?: number;

  destination: string;
  purpose: string;
  remarks?: string | null;

  travel_date: string;
  departure_time: string; // "HH:MM" (24h)
  expected_return_date: string;
  expected_return_time: string;

  passenger_count: number;
  passenger_details?: string | null;

  // Sent together or not at all. null clears an existing assignment.
  vehicle_id?: number | null;
  driver_id?: number | null;
}

export interface VehicleBookingStatusData {
  status: VehicleBookingStatusChange;
  approval_remarks?: string | null; // required when rejecting
  cancellation_reason?: string | null; // required when cancelling
}

export interface VehicleBookingAssignment {
  vehicle_id: number;
  driver_id: number;
}

export interface VehicleBookingListParams {
  search?: string;
  status?: VehicleBookingStatus;
  approval_stage?: string;
  office_id?: number;
}

export interface VehicleBookingApiResponse<T> {
  message: string;
  data: T;
}
