import type { VehicleBookingColumns } from "./VehicleBookingColumns";
import { ApprovalStage } from "../permissions/constants";
import {
  formatDate,
  formatDateRange,
  formatTime,
  getToday,
  parseApiError,
  toTimeInput,
} from "./EventBookingHelpers";

export {
  formatDate,
  formatDateRange,
  formatTime,
  getToday,
  parseApiError,
  toTimeInput,
};

export const VEHICLE_APPROVAL_PIPELINE = [
  ApprovalStage.OFFICE_HEAD,
  ApprovalStage.VEHICLE_APPROVAL,
  ApprovalStage.VEHICLE_ADMIN,
  ApprovalStage.SUPER_ADMIN,
] as const;

export const VEHICLE_STAGE_LABELS: Record<string, string> = {
  [ApprovalStage.OFFICE_HEAD]: "Pending Dean Approval",
  [ApprovalStage.VEHICLE_APPROVAL]: "Pending Vehicle Approval Admin",
  [ApprovalStage.VEHICLE_ADMIN]: "Pending Vehicle Admin Approval",
  [ApprovalStage.SUPER_ADMIN]: "Pending Super Admin Approval",
};

export const getApprovalStageLabel = (
  stage: string | null | undefined,
): string =>
  VEHICLE_STAGE_LABELS[stage ?? ""] ??
  (stage ? stage.replace(/_/g, " ") : "N/A");

export const getLifecycleLabel = (booking: VehicleBookingColumns): string => {
  if (booking.status === "pending") {
    return getApprovalStageLabel(booking.approval_stage);
  }

  return getStatusLabel(booking.status);
};

export const isRequesterEditable = (booking: VehicleBookingColumns): boolean =>
  booking.status === "pending" &&
  booking.approval_stage === ApprovalStage.OFFICE_HEAD &&
  (booking.approvals?.length ?? 0) === 0;

export const isAssignmentStage = (booking: VehicleBookingColumns): boolean =>
  booking.status === "pending" &&
  (booking.approval_stage === ApprovalStage.VEHICLE_ADMIN ||
    booking.approval_stage === ApprovalStage.SUPER_ADMIN);

export const getStatusStyle = (status: VehicleBookingColumns["status"]): string => {
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

export const getStatusLabel = (
  status: VehicleBookingColumns["status"],
): string => {
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
