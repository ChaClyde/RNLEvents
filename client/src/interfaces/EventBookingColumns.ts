import type { VenueColumns } from "./VenueColumns";
import type { OfficeColumns } from "./OfficeColumns";

// ============================================================
// STATUS
// ============================================================

export type EventBookingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

// A booking can't be set back to "pending" through the status endpoint.
export type EventBookingStatusChange = Exclude<EventBookingStatus, "pending">;

// ============================================================
// RELATED RECORDS
// ============================================================

// The list endpoint returns only these venue columns.
// The venue dropdown in the form uses the full venue from VenueService.
export type EventBookingVenue = Pick<
  VenueColumns,
  "venue_id" | "venue" | "location" | "capacity" | "status"
> &
  Partial<VenueColumns>;

// The list endpoint returns only these office columns.
export type EventBookingOffice = Pick<OfficeColumns, "office_id"> &
  Partial<OfficeColumns>;

// ============================================================
// EVENT BOOKING RESOURCE
// ============================================================

export interface EventBookingResource {
  event_booking_resource_id: number;
  event_booking_id: number;

  // null = "Other equipment", or the venue resource was deleted later
  resource_id: number | null;

  resource_name: string;
  quantity: number;
  notes: string | null;

  created_at?: string;
  updated_at?: string;
}

// What the form sends for each requested resource
export interface EventBookingResourceInput {
  resource_id: number | null;
  resource_name: string;
  quantity: number;
  notes?: string | null;
}

// ============================================================
// EVENT BOOKING
// ============================================================

export interface EventBookingColumns {
  event_booking_id: number;

  // Venue
  venue_id: number;
  venue?: EventBookingVenue;

  // Event Information
  purpose: string;
  description: string | null;

  // Schedule
  date_start: string; // YYYY-MM-DD
  date_end: string; // YYYY-MM-DD
  time_start: string; // HH:MM:SS (use toTimeInput() in forms)
  time_end: string; // HH:MM:SS (use toTimeInput() in forms)
  number_of_days: number;

  // Participants
  expected_attendees: number;

  // Requested Resources
  resources?: EventBookingResource[];

  // Requestor
  requested_by: string;
  requested_by_user_id?: number | null;
  requester?: {
    user_id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  office_id: number;
  office?: EventBookingOffice;

  email: string;
  tel_number: string;

  // Approval
  status: EventBookingStatus;
  approval_stage: string;
  approval_remarks: string | null;
  approvals?: EventBookingApprovalRecord[];

  // Cancellation
  cancellation_reason: string | null;

  // Soft Delete
  is_deleted: boolean;

  created_at: string;
  updated_at: string;
}

// ============================================================
// FORM DATA
// ============================================================

export interface EventBookingFormData {
  venue_id: number;

  purpose: string;
  description?: string | null;

  date_start: string; // YYYY-MM-DD
  date_end: string; // YYYY-MM-DD
  time_start: string; // HH:MM
  time_end: string; // HH:MM

  expected_attendees: number;

  resources: EventBookingResourceInput[];

  requested_by: string;
  office_id: number;

  email: string;
  tel_number: string;
}

// ============================================================
// STATUS UPDATE
// ============================================================

export interface EventBookingApprovalRecord {
  event_booking_approval_id: number;
  event_booking_id: number;
  approver_user_id: number;
  approval_stage: string;
  action: "approved" | "rejected";
  remarks: string | null;
  created_at: string;
  approver?: {
    user_id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
}

export interface EventBookingStatusData {
  status: EventBookingStatusChange;
  approval_remarks?: string | null; // required when rejecting
  cancellation_reason?: string | null; // required when cancelling
}

// ============================================================
// FILTERS
// ============================================================

export interface EventBookingFilters {
  search?: string;
  status?: EventBookingStatus;
  venue_id?: number;
  office_id?: number;
  date_start?: string;
  date_end?: string;
}

// ============================================================
// API RESPONSES
// ============================================================

export interface EventBookingResponse {
  message: string;
  data: EventBookingColumns;
}

export interface EventBookingListResponse {
  message: string;
  data: EventBookingColumns[];
}

export interface EventBookingMessageResponse {
  message: string;
}

// ============================================================
// FIELD ERRORS
// ============================================================

export interface EventBookingFieldErrors {
  venue_id?: string[];

  purpose?: string[];
  description?: string[];

  // Schedule
  date_start?: string[];
  date_end?: string[];
  time_start?: string[];
  time_end?: string[];

  // Participants
  expected_attendees?: string[];

  // Resources
  resources?: string[];

  // Requestor
  requested_by?: string[];
  office_id?: string[];
  email?: string[];
  tel_number?: string[];

  // Approval
  status?: string[];
  approval_stage?: string[];
  approval_remarks?: string[];
  cancellation_reason?: string[];

  // Nested keys such as "resources.0.quantity"
  [key: string]: string[] | undefined;
}
