import type {
  DriverColumns,
  DriverFieldErrors,
  DriverFormData,
  DriverStatus,
} from "./DriverColumns";
import type { VehicleColumns } from "./VehicleColumns";

// ============================================================
// STATUS
// ============================================================

const statusStyles: Record<DriverStatus, string> = {
  Available: "bg-emerald-50 text-emerald-600 border-emerald-200",
  "On Leave": "bg-amber-50 text-amber-600 border-amber-200",
  "Sick Leave": "bg-orange-50 text-orange-600 border-orange-200",
  Unavailable: "bg-red-50 text-red-600 border-red-200",
};

export const getDriverStatusStyle = (status: DriverStatus): string =>
  statusStyles[status] ?? "bg-gray-50 text-gray-600 border-gray-200";

// ============================================================
// DATES
// ============================================================

// "2026-11-10" -> "Nov 10, 2026"
export const formatDriverDate = (date: string | null): string => {
  if (!date) return "";

  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Text for the period a non-available status covers
export const getAvailabilityPeriod = (
  driver: Pick<
    DriverColumns,
    "driver_status" | "status_start_date" | "status_end_date"
  >,
): string | null => {
  if (driver.driver_status === "Available") return null;

  const start = formatDriverDate(driver.status_start_date);
  const end = formatDriverDate(driver.status_end_date);

  if (start && end) return start === end ? start : `${start} - ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;

  return "Until set back to Available";
};

// ============================================================
// LICENSE
// ============================================================

export type LicenseState = "none" | "valid" | "expiring" | "expired";

export const getLicenseState = (
  driver: Pick<DriverColumns, "license_expiry" | "is_license_expired">,
): LicenseState => {
  if (!driver.license_expiry) return "none";
  if (driver.is_license_expired) return "expired";

  const today = new Date(`${new Date().toLocaleDateString("en-CA")}T00:00:00`);
  const expiry = new Date(`${driver.license_expiry}T00:00:00`);
  const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);

  return days <= 30 ? "expiring" : "valid";
};

// ============================================================
// FORM VALUES
// ============================================================

export interface DriverFormValues {
  driver_name: string;
  contact_number: string;
  email: string;
  license_number: string;
  license_expiry: string;
  is_reliever: boolean;
  default_vehicle_id: string;
  driver_status: DriverStatus;
  status_remarks: string;
  status_start_date: string;
  status_end_date: string;
}

export const emptyDriverForm: DriverFormValues = {
  driver_name: "",
  contact_number: "",
  email: "",
  license_number: "",
  license_expiry: "",
  is_reliever: false,
  default_vehicle_id: "",
  driver_status: "Available",
  status_remarks: "",
  status_start_date: "",
  status_end_date: "",
};

export const driverToForm = (
  driver: DriverColumns,
  vehicles: Pick<VehicleColumns, "vehicle_id">[] = [],
): DriverFormValues => {
  // Keep the saved vehicle unless we can see it is no longer selectable.
  // (If the vehicle list failed to load, keep it so saving doesn't clear it.)
  const vehicleStillListed =
    vehicles.length === 0 ||
    vehicles.some(
      (vehicle) => vehicle.vehicle_id === driver.default_vehicle_id,
    );

  return {
    driver_name: driver.driver_name,
    contact_number: driver.contact_number ?? "",
    email: driver.email ?? "",
    license_number: driver.license_number ?? "",
    license_expiry: driver.license_expiry ?? "",
    is_reliever: driver.is_reliever,
    default_vehicle_id:
      driver.default_vehicle_id !== null && vehicleStillListed
        ? String(driver.default_vehicle_id)
        : "",
    driver_status: driver.driver_status,
    status_remarks: driver.status_remarks ?? "",
    status_start_date: driver.status_start_date ?? "",
    status_end_date: driver.status_end_date ?? "",
  };
};

// An "Available" driver sends no remarks or dates (the backend clears them too)
export const buildDriverPayload = (
  values: DriverFormValues,
): DriverFormData => {
  const available = values.driver_status === "Available";

  return {
    driver_name: values.driver_name.trim(),
    contact_number: values.contact_number.trim() || null,
    email: values.email.trim() || null,
    license_number: values.license_number.trim() || null,
    license_expiry: values.license_expiry || null,
    is_reliever: values.is_reliever,
    default_vehicle_id: values.default_vehicle_id
      ? Number(values.default_vehicle_id)
      : null,
    driver_status: values.driver_status,
    status_remarks: available ? null : values.status_remarks.trim() || null,
    status_start_date: available ? null : values.status_start_date || null,
    status_end_date: available ? null : values.status_end_date || null,
  };
};

// ============================================================
// VALIDATION (instant feedback; the backend validates again)
// ============================================================

export const validateDriverForm = (
  values: DriverFormValues,
): DriverFieldErrors => {
  const errors: DriverFieldErrors = {};
  const name = values.driver_name.trim();

  if (!name) {
    errors.driver_name = ["Driver name is required."];
  } else if (name.length < 3) {
    errors.driver_name = ["Driver name must be at least 3 characters."];
  }

  const email = values.email.trim();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ["Please enter a valid email address."];
  }

  if (
    values.driver_status !== "Available" &&
    values.status_start_date &&
    values.status_end_date &&
    values.status_end_date < values.status_start_date
  ) {
    errors.status_end_date = [
      "The end date must be on or after the start date.",
    ];
  }

  return errors;
};
