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
// SCHEDULE
// ============================================================

// range = every day, weekly = selected weekdays, custom = hand-picked dates
export type ScheduleType = "range" | "weekly" | "custom";

// One booked date with its own start/end time
export interface EventBookingScheduleRow {
  event_booking_schedule_id: number;
  event_booking_id: number;
  venue_id: number;
  schedule_date: string; // YYYY-MM-DD
  time_start: string; // HH:MM:SS
  time_end: string; // HH:MM:SS
  time_start_label: string | null; // "1:00 PM"
  time_end_label: string | null; // "5:00 PM"
}

// Sent to the backend (store / update / check-availability)
export interface EventBookingScheduleInput {
  schedule_type: ScheduleType;
  weekdays?: number[]; // weekly only: 0 = Sunday ... 6 = Saturday
  date_start: string | null;
  date_end: string | null;
  time_start: string; // default daily time, "HH:MM"
  time_end: string;
  excluded_dates?: string[];
  overrides?: { date: string; time_start: string; time_end: string }[];
  dates?: { date: string; time_start: string; time_end: string }[]; // custom
}

// ============================================================
// CONFLICTS / SUGGESTIONS / CALENDAR
// ============================================================

export interface FreeSlot {
  time_start: string;
  time_end: string;
  time_start_label: string;
  time_end_label: string;
}

export interface VenueConflict {
  date: string;
  requested: {
    time_start: string;
    time_end: string;
    time_start_label: string;
    time_end_label: string;
  };
  conflicts_with: {
    event_booking_id: number;
    purpose: string;
    status: EventBookingStatus;
    office: string | null;
    time_start_label: string;
    time_end_label: string;
  }[];
}

export interface ConflictSuggestion {
  conflict_date: string;
  free_slots_that_day: FreeSlot[];
  alternative_dates: {
    date: string;
    day: string;
    time_start_label: string;
    time_end_label: string;
  }[];
}

export interface AvailabilityCheckResponse {
  available: boolean;
  conflicts: VenueConflict[];
  suggestions: ConflictSuggestion[];
}

export interface CalendarEventSummary {
  event_booking_id: number;
  purpose: string;
  status: EventBookingStatus;
  office: string | null;
  time_start_label: string;
  time_end_label: string;
}

export interface CalendarEventDetail extends CalendarEventSummary {
  description: string | null;
  requested_by: string;
  approval_stage: string;
  expected_attendees: number;
  schedule_type: ScheduleType;
  booking_date_start: string;
  booking_date_end: string;
  number_of_days: number;
}

export interface VenueCalendarDay {
  date: string;
  status: "booked" | "partial";
  events_count: number;
  events: CalendarEventSummary[];
}

export interface VenueCalendarMonthResponse {
  message: string;
  data: {
    venue: { venue_id: number; venue: string; status: string };
    month: string;
    window: { start_label: string; end_label: string };
    days: VenueCalendarDay[]; // dates not listed are fully available
  };
}

export interface VenueCalendarDayResponse {
  message: string;
  data: {
    date: string;
    day: string;
    events: CalendarEventDetail[];
    free_slots: FreeSlot[];
  };
}

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

  // Schedule (booking-level summary; per-date rows are in `schedules`)
  schedule_type: ScheduleType;
  weekdays: number[] | null; // 0 = Sunday ... 6 = Saturday
  date_start: string; // YYYY-MM-DD (first date)
  date_end: string; // YYYY-MM-DD (last date)
  time_start: string; // default daily time, HH:MM:SS
  time_end: string; // default daily time, HH:MM:SS
  time_start_label?: string | null; // "1:00 PM"
  time_end_label?: string | null; // "5:00 PM"
  number_of_days: number; // number of booked dates
  schedules?: EventBookingScheduleRow[];

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

export interface EventBookingFormData extends EventBookingScheduleInput {
  venue_id: number;

  purpose: string;
  description?: string | null;

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
  schedule?: string[];
  weekdays?: string[];
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

  // Nested keys such as "resources.0.quantity", "overrides.0.date", "dates.1.date"
  [key: string]: string[] | undefined;
}
