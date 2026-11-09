import { useEffect, useState, type ChangeEvent, type FC } from "react";
import { AlertCircle, Camera, Truck, User, X } from "lucide-react";

import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import type {
  VehicleFieldErrors,
  VehicleStatus,
} from "../../../interfaces/VehicleColumns";
import {
  validateVehicleImage,
  VEHICLE_STATUS_OPTIONS,
  type VehicleFormValues,
} from "../../../interfaces/VehicleHelpers";

const controlClass =
  "w-full rounded-xl border border-[#0095D9]/20 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0095D9] disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-medium text-gray-500";

// ============================================================
// ERROR BANNER
// ============================================================

export const VehicleFormError: FC<{ message: string }> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
};

// ============================================================
// PHOTO PICKER
// ============================================================

interface VehiclePhotoPickerProps {
  inputId: string;
  file: File | null;
  existingUrl?: string | null;
  removeExisting?: boolean;
  error?: string;
  onFileChange: (file: File | null) => void;
  onRemoveExistingChange?: (remove: boolean) => void;
}

export const VehiclePhotoPicker: FC<VehiclePhotoPickerProps> = ({
  inputId,
  file,
  existingUrl = null,
  removeExisting = false,
  error,
  onFileChange,
  onRemoveExistingChange,
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");

  // Create a preview for the chosen file and release it when it changes
  useEffect(() => {
    const url = file ? URL.createObjectURL(file) : null;
    setObjectUrl(url);

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  const preview = objectUrl ?? (removeExisting ? null : existingUrl);
  const canRemove = Boolean(file) || (Boolean(existingUrl) && !removeExisting);

  const handleSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = ""; // allow choosing the same file again

    if (!selected) return;

    const problem = validateVehicleImage(selected);
    setLocalError(problem ?? "");

    if (problem) return;

    onFileChange(selected);
    onRemoveExistingChange?.(false);
  };

  const handleRemove = () => {
    setLocalError("");

    // A newly chosen file is discarded first; the saved photo comes back
    if (file) {
      onFileChange(null);
      return;
    }

    onRemoveExistingChange?.(true);
  };

  const shownError = localError || error;

  return (
    <div>
      <div className="relative h-64 w-full overflow-hidden rounded-2xl border-2 border-dashed border-[#0095D9]/30 bg-[#0095D9]/5">
        {preview ? (
          <img
            src={preview}
            alt="Vehicle preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#0095D9]/60">
            <Truck size={40} />
            <p className="text-sm font-medium">No photo selected</p>
          </div>
        )}

        {preview && canRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#0095D9] text-white shadow"
            aria-label="Remove photo"
          >
            <X size={16} />
          </button>
        )}

        <label
          htmlFor={inputId}
          className="absolute bottom-3 right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-[#0095D9] bg-white text-[#0095D9] transition-all hover:bg-[#0095D9]/10"
        >
          <Camera size={18} />
        </label>

        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleSelect}
        />
      </div>

      <p className="mt-2 text-xs text-gray-400">JPG, PNG or WEBP, up to 2MB.</p>

      {shownError && <p className="mt-1 text-xs text-red-500">{shownError}</p>}
    </div>
  );
};

// ============================================================
// FIELDS
// ============================================================

interface VehicleFormFieldsProps {
  values: VehicleFormValues;
  errors: VehicleFieldErrors;
  onChange: <K extends keyof VehicleFormValues>(
    field: K,
    value: VehicleFormValues[K],
  ) => void;
  autoFocus?: boolean;
}

const VehicleFormFields: FC<VehicleFormFieldsProps> = ({
  values,
  errors,
  onChange,
  autoFocus = false,
}) => (
  <>
    {/* Vehicle Information */}
    <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
      <div className="mb-5 flex items-center gap-2">
        <Truck size={18} className="text-[#0095D9]" />
        <h2 className="font-semibold text-[#003B5C]">Vehicle Information</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FloatingLabelInput
          label="Vehicle Name"
          type="text"
          name="vehicle_name"
          value={values.vehicle_name}
          onChange={(e) => onChange("vehicle_name", e.target.value)}
          errors={errors.vehicle_name}
          required
          autoFocus={autoFocus}
        />

        <FloatingLabelInput
          label="Plate Number"
          type="text"
          name="plate_number"
          value={values.plate_number}
          onChange={(e) => onChange("plate_number", e.target.value)}
          errors={errors.plate_number}
          required
        />

        <FloatingLabelInput
          label="Vehicle Type"
          type="text"
          name="vehicle_type"
          value={values.vehicle_type}
          onChange={(e) => onChange("vehicle_type", e.target.value)}
          errors={errors.vehicle_type}
        />

        <FloatingLabelInput
          label="Seating Capacity"
          type="number"
          name="capacity"
          value={values.capacity}
          onChange={(e) => onChange("capacity", e.target.value)}
          errors={errors.capacity}
          required
        />

        <FloatingLabelInput
          label="Seating Notes (e.g. front seats only)"
          type="text"
          name="seating_notes"
          value={values.seating_notes}
          onChange={(e) => onChange("seating_notes", e.target.value)}
          errors={errors.seating_notes}
        />

        <div>
          <label className={labelClass} htmlFor="vehicle_status">
            Status
          </label>

          <select
            id="vehicle_status"
            value={values.status}
            onChange={(e) =>
              onChange("status", e.target.value as VehicleStatus)
            }
            className={controlClass}
          >
            {VEHICLE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {errors.status && (
            <p className="mt-1 text-xs text-red-500">{errors.status[0]}</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label className={labelClass} htmlFor="vehicle_description">
          Description
        </label>

        <textarea
          id="vehicle_description"
          rows={3}
          value={values.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Shown to requesters when they pick this vehicle"
          className={controlClass}
        />

        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description[0]}</p>
        )}
      </div>
    </div>

    {/* Person in Charge */}
    <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
      <div className="mb-5 flex items-center gap-2">
        <User size={18} className="text-[#0095D9]" />
        <h2 className="font-semibold text-[#003B5C]">Person in Charge</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FloatingLabelInput
          label="Person in Charge"
          type="text"
          name="person_in_charge"
          value={values.person_in_charge}
          onChange={(e) => onChange("person_in_charge", e.target.value)}
          errors={errors.person_in_charge}
        />

        <FloatingLabelInput
          label="Contact Number"
          type="number"
          name="pic_contact_number"
          value={values.pic_contact_number}
          onChange={(e) => onChange("pic_contact_number", e.target.value)}
          errors={errors.pic_contact_number}
        />

        <div className="md:col-span-2">
          <FloatingLabelInput
            label="Email"
            type="email"
            name="pic_email"
            value={values.pic_email}
            onChange={(e) => onChange("pic_email", e.target.value)}
            errors={errors.pic_email}
          />
        </div>
      </div>
    </div>
  </>
);

export default VehicleFormFields;
