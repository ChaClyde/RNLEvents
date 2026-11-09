import type {
  EventBookingColumns,
  EventBookingStatus,
} from "./EventBookingColumns";
import { ApprovalStage } from "../permissions/constants";

export const EVENT_APPROVAL_PIPELINE = [
  ApprovalStage.OFFICE_HEAD,
  ApprovalStage.EVENT_APPROVAL,
  ApprovalStage.EVENT_ADMIN,
  ApprovalStage.SUPER_ADMIN,
] as const;

export const EVENT_STAGE_LABELS: Record<string, string> = {
  [ApprovalStage.OFFICE_HEAD]: "Pending Dean Approval",
  [ApprovalStage.EVENT_APPROVAL]: "Pending Event Approval Admin",
  [ApprovalStage.EVENT_ADMIN]: "Pending Administrator Approval",
  [ApprovalStage.SUPER_ADMIN]: "Pending Super Admin Approval",
};

export const getApprovalStageLabel = (stage: string | null | undefined): string =>
  EVENT_STAGE_LABELS[stage ?? ""] ?? (stage ? stage.replace(/_/g, " ") : "N/A");

export const getLifecycleLabel = (booking: EventBookingColumns): string => {
  if (booking.status === "pending") {
    return getApprovalStageLabel(booking.approval_stage);
  }

  return getStatusLabel(booking.status);
};

export const isRequesterEditable = (booking: EventBookingColumns): boolean =>
  booking.status === "pending" &&
  booking.approval_stage === ApprovalStage.OFFICE_HEAD &&
  (booking.approvals?.length ?? 0) === 0;

// Today as YYYY-MM-DD in the user's local time
export const getToday = (): string => new Date().toLocaleDateString("en-CA");

export const formatDate = (date: string): string => {
  if (!date) return "N/A";

  const parsedDate = new Date(`${date.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// 24-hour "HH:MM:SS" -> "8:00 AM"
export const formatTime = (time: string): string => {
  if (!time) return "N/A";

  const [hours, minutes] = time.split(":");
  const parsedHours = Number(hours);

  if (
    Number.isNaN(parsedHours) ||
    !minutes ||
    parsedHours < 0 ||
    parsedHours > 23
  ) {
    return time;
  }

  const period = parsedHours >= 12 ? "PM" : "AM";
  const formattedHours = parsedHours % 12 || 12;

  return `${formattedHours}:${minutes.slice(0, 2)} ${period}`;
};

// "08:00:00" -> "08:00" (for <input type="time">)
export const toTimeInput = (time: string | null | undefined): string =>
  time?.slice(0, 5) ?? "";

export const formatDateRange = (dateStart: string, dateEnd: string): string => {
  if (dateStart === dateEnd) return formatDate(dateStart);

  return `${formatDate(dateStart)} - ${formatDate(dateEnd)}`;
};

export const calculateDays = (dateStart: string, dateEnd: string): number => {
  if (!dateStart || !dateEnd) return 0;

  const start = new Date(`${dateStart}T00:00:00`);
  const end = new Date(`${dateEnd}T00:00:00`);

  const difference = end.getTime() - start.getTime();

  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
};

// ============================================================
// STATUS
// ============================================================

export const getStatusStyle = (status: EventBookingStatus): string => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-700 dark:bg-green-900/80 dark:text-green-300";

    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-900/80 dark:text-red-300";

    case "cancelled":
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

    default:
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/80 dark:text-yellow-300";
  }
};

export const getStatusLabel = (status: EventBookingStatus): string => {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
};

// ============================================================
// API ERRORS
// ============================================================

export interface ScheduleConflict {
  type?: string;
  id?: number | null;
  purpose?: string | null;
  status?: string;
  date_start?: string;
  date_end?: string;
  time_start?: string;
  time_end?: string;
  travel_date?: string;
  expected_return_date?: string;
  departure_time?: string;
  expected_return_time?: string;
  requested_by?: string | null;
  visible?: boolean;
}

export interface ParsedApiError {
  status?: number;
  message: string;
  fieldErrors: Record<string, string>;
  conflicts: ScheduleConflict[];
}

export const parseApiError = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): ParsedApiError => {
  const err = error as {
    response?: {
      status?: number;
      data?: {
        message?: string;
        errors?: Record<string, string[] | string>;
        conflicts?: ScheduleConflict[];
      };
    };
  };

  const fieldErrors: Record<string, string> = {};

  Object.entries(err.response?.data?.errors ?? {}).forEach(([key, value]) => {
    fieldErrors[key] = Array.isArray(value) ? String(value[0]) : String(value);
  });

  return {
    status: err.response?.status,
    message: err.response?.data?.message ?? fallback,
    fieldErrors,
    conflicts: Array.isArray(err.response?.data?.conflicts)
      ? err.response.data.conflicts
      : [],
  };
};
