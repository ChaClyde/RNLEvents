import type {
  VehicleAvailabilityStatus,
  VehicleColumns,
  VehicleFieldErrors,
  VehicleStatus,
} from "./VehicleColumns";
import type {
  MaintenanceFieldErrors,
  MaintenancePhase,
  VehicleMaintenanceColumns,
} from "./VehicleMaintenanceColumns";

// ============================================================
// API ERRORS
// ============================================================

export interface ParsedApiError<T> {
  status?: number;
  message: string;
  fieldErrors: T;
}

const parseApiError = <T extends object>(
  error: unknown,
  fallback: string,
): ParsedApiError<T> => {
  const err = error as {
    response?: {
      status?: number;
      data?: {
        message?: string;
        errors?: Record<string, string[] | string>;
      };
    };
  };

  const fieldErrors: Record<string, string[]> = {};

  Object.entries(err.response?.data?.errors ?? {}).forEach(([key, value]) => {
    fieldErrors[key] = Array.isArray(value)
      ? value.map(String)
      : [String(value)];
  });

  return {
    status: err.response?.status,
    message: err.response?.data?.message ?? fallback,
    fieldErrors: fieldErrors as unknown as T,
  };
};

export const parseVehicleError = (error: unknown, fallback: string) =>
  parseApiError<VehicleFieldErrors>(error, fallback);

export const parseMaintenanceError = (error: unknown, fallback: string) =>
  parseApiError<MaintenanceFieldErrors>(error, fallback);

// ============================================================
// DATES (local time, "YYYY-MM-DD")
// ============================================================

const parseDate = (date: string): Date => {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day);
};

export const getToday = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;
};

// "Nov 20, 2026"
export const formatDate = (date: string): string => {
  if (!date) return "—";

  const parsed = parseDate(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatDateRange = (start: string, end: string): string =>
  start === end
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;

// ============================================================
// VEHICLE STATUS
// ============================================================

// Options in the vehicle form (what can be saved)
export const VEHICLE_STATUS_OPTIONS: {
  value: VehicleStatus;
  label: string;
}[] = [
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
  { value: "maintenance", label: "Under Maintenance" },
];

// Options in the vehicle list filter (what is shown)
export const VEHICLE_AVAILABILITY_OPTIONS: {
  value: VehicleAvailabilityStatus;
  label: string;
}[] = [...VEHICLE_STATUS_OPTIONS];

const STATUS_LABELS: Record<VehicleAvailabilityStatus, string> = {
  available: "Available",
  unavailable: "Unavailable",
  maintenance: "Under Maintenance",
};

const STATUS_STYLES: Record<VehicleAvailabilityStatus, string> = {
  available: "bg-green-100 text-green-700",
  unavailable: "bg-red-100 text-red-700",
  maintenance: "bg-amber-100 text-amber-700",
};

const NOTICE_STYLES: Record<VehicleAvailabilityStatus, string> = {
  available: "border-sky-200 bg-sky-50 text-sky-700",
  unavailable: "border-red-200 bg-red-50 text-red-700",
  maintenance: "border-amber-200 bg-amber-50 text-amber-800",
};

export const getVehicleStatusLabel = (
  status: VehicleAvailabilityStatus,
): string => STATUS_LABELS[status] ?? status;

export const getVehicleStatusStyle = (
  status: VehicleAvailabilityStatus,
): string => STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700";

export const getAvailabilityNoticeStyle = (
  status: VehicleAvailabilityStatus,
): string => NOTICE_STYLES[status] ?? NOTICE_STYLES.available;

// The trash list does not include the computed field, so fall back to status
export const getVehicleAvailability = (
  vehicle: VehicleColumns,
): VehicleAvailabilityStatus => vehicle.availability_status ?? vehicle.status;

// ============================================================
// VEHICLE FORM
// ============================================================

export interface VehicleFormValues {
  vehicle_name: string;
  plate_number: string;
  vehicle_type: string;
  description: string;

  capacity: string;
  seating_notes: string;

  person_in_charge: string;
  pic_contact_number: string;
  pic_email: string;

  status: VehicleStatus;
}

export const emptyVehicleForm: VehicleFormValues = {
  vehicle_name: "",
  plate_number: "",
  vehicle_type: "",
  description: "",
  capacity: "",
  seating_notes: "",
  person_in_charge: "",
  pic_contact_number: "",
  pic_email: "",
  status: "available",
};

export const vehicleToForm = (vehicle: VehicleColumns): VehicleFormValues => ({
  vehicle_name: vehicle.vehicle_name ?? "",
  plate_number: vehicle.plate_number ?? "",
  vehicle_type: vehicle.vehicle_type ?? "",
  description: vehicle.description ?? "",
  capacity: String(vehicle.capacity ?? ""),
  seating_notes: vehicle.seating_notes ?? "",
  person_in_charge: vehicle.person_in_charge ?? "",
  pic_contact_number: vehicle.pic_contact_number ?? "",
  pic_email: vehicle.pic_email ?? "",
  status: vehicle.status,
});

// The image is sent under "image_path", the name the API expects.
// remove_image is "1" because Laravel's boolean rule rejects "true".
export const buildVehicleFormData = (
  values: VehicleFormValues,
  image: File | null,
  removeImage = false,
): FormData => {
  const formData = new FormData();

  (Object.keys(values) as (keyof VehicleFormValues)[]).forEach((key) => {
    formData.append(key, String(values[key]).trim());
  });

  if (image) {
    formData.append("image_path", image);
  } else if (removeImage) {
    formData.append("remove_image", "1");
  }

  return formData;
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// Returns a message, or null when the file is fine
export const validateVehicleImage = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Vehicle image must be JPG, JPEG, PNG or WEBP.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "Vehicle image must not exceed 2MB.";
  }

  return null;
};

// ============================================================
// MAINTENANCE
// ============================================================

export const MAINTENANCE_PHASE_OPTIONS: {
  value: MaintenancePhase;
  label: string;
}[] = [
  { value: "ongoing", label: "Ongoing" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PHASE_STYLES: Record<MaintenancePhase, string> = {
  ongoing: "bg-amber-100 text-amber-700",
  upcoming: "bg-sky-100 text-sky-700",
  overdue: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export const getMaintenancePhaseLabel = (phase: MaintenancePhase): string =>
  MAINTENANCE_PHASE_OPTIONS.find((option) => option.value === phase)?.label ??
  phase;

export const getMaintenancePhaseStyle = (phase: MaintenancePhase): string =>
  PHASE_STYLES[phase] ?? "bg-gray-100 text-gray-600";

export interface MaintenanceFormValues {
  vehicle_id: string;
  reason: string;
  notes: string;
  date_start: string;
  date_end: string;
}

export const emptyMaintenanceForm: MaintenanceFormValues = {
  vehicle_id: "",
  reason: "",
  notes: "",
  date_start: "",
  date_end: "",
};

export const maintenanceToForm = (
  record: VehicleMaintenanceColumns,
): MaintenanceFormValues => ({
  vehicle_id: String(record.vehicle_id),
  reason: record.reason ?? "",
  notes: record.notes ?? "",
  date_start: record.date_start.slice(0, 10),
  date_end: record.date_end.slice(0, 10),
});
