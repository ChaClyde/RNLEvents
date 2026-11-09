import type { DriverColumns } from "./DriverColumns";
import type { OfficeColumns } from "./OfficeColumns";
import type { VehicleColumns } from "./VehicleColumns";

export type VehicleBookingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type VehicleBookingStatusChange = Exclude<VehicleBookingStatus, "pending">;

export type VehicleBookingOffice = Pick<OfficeColumns, "office_id"> &
  Partial<OfficeColumns>;

export interface VehicleBookingApprovalRecord {
  vehicle_booking_approval_id: number;
  vehicle_booking_id: number;
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

export interface VehicleBookingColumns {
  vehicle_booking_id: number;
  requested_by_user_id: number;
  office_id: number;
  requested_by: string;
  email: string;
  tel_number: string;
  destination: string;
  purpose: string;
  remarks: string | null;
  travel_date: string;
  departure_time: string;
  expected_return_date: string;
  expected_return_time: string;
  passenger_count: number;
  passenger_details: string | null;
  vehicle_id: number | null;
  driver_id: number | null;
  status: VehicleBookingStatus;
  approval_stage: string;
  approval_remarks: string | null;
  cancellation_reason: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  office?: VehicleBookingOffice;
  requester?: {
    user_id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  vehicle?: VehicleColumns | null;
  driver?: DriverColumns | null;
  approvals?: VehicleBookingApprovalRecord[];
}

export interface VehicleBookingFormData {
  destination: string;
  purpose: string;
  remarks?: string | null;
  travel_date: string;
  departure_time: string;
  expected_return_date: string;
  expected_return_time: string;
  passenger_count: number;
  passenger_details?: string | null;
  requested_by: string;
  office_id: number;
  email: string;
  tel_number: string;
}

export interface VehicleBookingAssignmentData {
  vehicle_id: number;
  driver_id: number;
}

export interface VehicleBookingStatusData {
  status: VehicleBookingStatusChange;
  approval_remarks?: string | null;
  cancellation_reason?: string | null;
}

export interface VehicleBookingResponse {
  message: string;
  data: VehicleBookingColumns;
}

export interface VehicleBookingListResponse {
  message: string;
  data: VehicleBookingColumns[];
}

export interface VehicleBookingMessageResponse {
  message: string;
}
