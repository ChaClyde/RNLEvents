import type { EventBookingFeeSnapshot } from "./EventBookingColumns";

export type ApprovalStageKey =
  | "office_head"
  | "event_admin"
  | "event_approval"
  | "super_admin";

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface ApprovalRecord {
  event_booking_approval_id: number;
  approval_stage: ApprovalStageKey;
  decision_slot?: "business_manager" | "vp_finance" | null;
  action: "approved" | "rejected";
  remarks: string | null;
  has_signature?: boolean;
  signer_name?: string | null;
  signer_position?: string | null;
  created_at: string;
  approver?: { user_id: number; full_name: string } | null;
}

export interface EventBooking {
  event_booking_id: number;
  purpose: string;
  description: string | null;
  venue?: { venue_id: number; venue: string; location?: string } | null;
  office?: {
    office_id: number;
    office_name: string;
    office_code: string;
  } | null;
  requested_by: string;
  email: string;
  tel_number: string;
  has_requester_signature?: boolean;
  requester_signer_name?: string | null;
  requester_signer_position?: string | null;
  fee_snapshot?: EventBookingFeeSnapshot | null;
  date_start: string;
  date_end: string;
  number_of_days: number;
  time_start?: string | null;
  time_end?: string | null;
  time_start_label: string | null;
  time_end_label: string | null;
  schedules?: {
    schedule_date: string;
    time_start: string;
    time_end: string;
    time_start_label?: string | null;
    time_end_label?: string | null;
  }[];
  expected_attendees: number;
  status: BookingStatus;
  approval_stage: ApprovalStageKey;
  approval_remarks: string | null;
  cancellation_reason: string | null;
  approvals?: ApprovalRecord[];
  attachments?: {
    attachment_id: number;
    original_filename: string;
    mime_type: string;
    file_size: number;
    attachment_type: string;
  }[];
  created_at: string;
}

export interface ApiList<T> {
  message: string;
  data: T[];
}

export interface ApiItem<T> {
  message: string;
  data: T;
}
