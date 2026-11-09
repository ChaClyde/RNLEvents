import { isAxiosError } from "axios";

import type {
  VehicleColumns,
  VehicleFieldErrors,
  VehicleStatus,
} from "./VehicleColumns";

// ============================================================
// STATUS
// ============================================================

export const VEHICLE_STATUS_OPTIONS: { value: VehicleStatus; label: string }[] =
  [
    { value: "available", label: "Available" },
    { value: "unavailable", label: "Unavailable" },
    { value: "maintenance", label: "Under Maintenance" },
  ];

export const getVehicleStatusLabel = (status: VehicleStatus): string =>
  VEHICLE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
  status;

export const getVehicleStatusStyle = (status: VehicleStatus): string => {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-700";
    case "maintenance":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

// ============================================================
// FORM VALUES
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
  vehicle_name: vehicle.vehicle_name,
  plate_number: vehicle.plate_number,
  vehicle_type: vehicle.vehicle_type ?? "",
  description: vehicle.description ?? "",
  capacity: String(vehicle.capacity),
  seating_notes: vehicle.seating_notes ?? "",
  person_in_charge: vehicle.person_in_charge ?? "",
  pic_contact_number: vehicle.pic_contact_number ?? "",
  pic_email: vehicle.pic_email ?? "",
  status: vehicle.status,
});

export const buildVehicleFormData = (
  values: VehicleFormValues,
  image: File | null,
  removeImage = false,
): FormData => {
  const formData = new FormData();

  (Object.keys(values) as (keyof VehicleFormValues)[]).forEach((key) => {
    formData.append(key, values[key].trim());
  });

  if (image) {
    formData.append("image_path", image);
  } else if (removeImage) {
    formData.append("remove_image", "1");
  }

  return formData;
};

// ============================================================
// IMAGE VALIDATION (mirrors the backend rules)
// ============================================================

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

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
// API ERRORS
// ============================================================

export interface ParsedVehicleError {
  status?: number;
  message: string;
  fieldErrors: VehicleFieldErrors;
}

export const parseVehicleError = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): ParsedVehicleError => {
  if (isAxiosError(error)) {
    if (!error.response) {
      return {
        message: "Unable to reach the server. Please check your connection.",
        fieldErrors: {},
      };
    }

    const data = error.response.data as
      | { message?: string; errors?: VehicleFieldErrors }
      | undefined;

    return {
      status: error.response.status,
      message: data?.message ?? fallback,
      fieldErrors: data?.errors ?? {},
    };
  }

  return { message: fallback, fieldErrors: {} };
};
