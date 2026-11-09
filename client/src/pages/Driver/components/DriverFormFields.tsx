import type { FC } from "react";
import { AlertCircle, Calendar, ClipboardList, UserRound } from "lucide-react";

import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import FloatingLabelSelect from "../../../components/Select/FloatingLabelSelect";
import {
  DRIVER_STATUSES,
  type DriverFieldErrors,
  type DriverStatus,
} from "../../../interfaces/DriverColumns";
import type { VehicleColumns } from "../../../interfaces/VehicleColumns";
import type { DriverFormValues } from "../../../interfaces/DriverHelpers";

const controlClass =
  "w-full rounded-xl border border-[#0095D9]/20 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0095D9]";

const labelClass = "mb-1.5 block text-xs font-medium text-gray-500";

// ============================================================
// ERROR BANNER
// ============================================================

export const DriverFormError: FC<{ message: string }> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
};

// ============================================================
// DATE FIELD (plain label so it never overlaps the date placeholder)
// ============================================================

const DateField: FC<{
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}> = ({ id, label, value, error, onChange }) => (
  <div>
    <label className={labelClass} htmlFor={id}>
      {label}
    </label>

    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={controlClass}
    />

    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

// ============================================================
// FIELDS
// ============================================================

interface DriverFormFieldsProps {
  values: DriverFormValues;
  errors: DriverFieldErrors;
  vehicles: VehicleColumns[];
  onChange: <K extends keyof DriverFormValues>(
    field: K,
    value: DriverFormValues[K],
  ) => void;
  autoFocus?: boolean;
}

const DriverFormFields: FC<DriverFormFieldsProps> = ({
  values,
  errors,
  vehicles,
  onChange,
  autoFocus = false,
}) => (
  <>
    {/* Driver Information */}
    <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
      <div className="mb-5 flex items-center gap-2">
        <UserRound size={18} className="text-[#0095D9]" />
        <h2 className="font-semibold text-[#003B5C]">Driver Information</h2>
      </div>

      <div className="space-y-4">
        <FloatingLabelInput
          label="Driver Name"
          type="text"
          name="driver_name"
          value={values.driver_name}
          onChange={(e) => onChange("driver_name", e.target.value)}
          errors={errors.driver_name}
          required
          autoFocus={autoFocus}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FloatingLabelInput
            label="Contact Number"
            type="number"
            name="contact_number"
            value={values.contact_number}
            onChange={(e) => onChange("contact_number", e.target.value)}
            errors={errors.contact_number}
          />

          <FloatingLabelInput
            label="Email"
            type="email"
            name="email"
            value={values.email}
            onChange={(e) => onChange("email", e.target.value)}
            errors={errors.email}
          />
        </div>
      </div>
    </div>

    {/* License and Assignment */}
    <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
      <div className="mb-5 flex items-center gap-2">
        <ClipboardList size={18} className="text-[#0095D9]" />
        <h2 className="font-semibold text-[#003B5C]">License & Assignment</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FloatingLabelInput
          label="License Number"
          type="text"
          name="license_number"
          value={values.license_number}
          onChange={(e) => onChange("license_number", e.target.value)}
          errors={errors.license_number}
        />

        <DateField
          id="driver_license_expiry"
          label="License Expiry Date"
          value={values.license_expiry}
          error={errors.license_expiry?.[0]}
          onChange={(value) => onChange("license_expiry", value)}
        />

        <FloatingLabelSelect
          label="Usual Vehicle"
          name="default_vehicle_id"
          value={values.default_vehicle_id}
          onChange={(e) => onChange("default_vehicle_id", e.target.value)}
          errors={errors.default_vehicle_id}
        >
          <option value="">No usual vehicle</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
              {vehicle.vehicle_name} ({vehicle.plate_number})
            </option>
          ))}
        </FloatingLabelSelect>

        <label className="flex cursor-pointer items-center gap-3 self-center text-sm text-gray-700">
          <input
            type="checkbox"
            checked={values.is_reliever}
            onChange={(e) => onChange("is_reliever", e.target.checked)}
            className="h-4 w-4 accent-[#0095D9]"
          />
          Reliever driver
        </label>
      </div>
    </div>

    {/* Availability */}
    <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
      <div className="mb-5 flex items-center gap-2">
        <Calendar size={18} className="text-[#0095D9]" />
        <h2 className="font-semibold text-[#003B5C]">Availability</h2>
      </div>

      <div className="space-y-4">
        <FloatingLabelSelect
          label="Status"
          name="driver_status"
          value={values.driver_status}
          onChange={(e) =>
            onChange("driver_status", e.target.value as DriverStatus)
          }
          errors={errors.driver_status}
        >
          {DRIVER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </FloatingLabelSelect>

        {values.driver_status !== "Available" && (
          <>
            <FloatingLabelInput
              label="Remarks (reason / notes)"
              type="text"
              name="status_remarks"
              value={values.status_remarks}
              onChange={(e) => onChange("status_remarks", e.target.value)}
              errors={errors.status_remarks}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DateField
                id="driver_status_start"
                label="From (optional)"
                value={values.status_start_date}
                error={errors.status_start_date?.[0]}
                onChange={(value) => onChange("status_start_date", value)}
              />

              <DateField
                id="driver_status_end"
                label="Until (optional)"
                value={values.status_end_date}
                error={errors.status_end_date?.[0]}
                onChange={(value) => onChange("status_end_date", value)}
              />
            </div>

            <p className="text-xs text-gray-400">
              Leave both dates empty if the driver stays unavailable until you
              set them back to Available.
            </p>
          </>
        )}
      </div>
    </div>
  </>
);

export default DriverFormFields;
