import { useMemo, useState } from "react";
import { FiAlertCircle, FiSave, FiX } from "react-icons/fi";

import type {
  VehicleBookingColumns,
  VehicleBookingFormData,
} from "../../../interfaces/VehicleBookingColumns";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import {
  getToday,
  parseApiError,
  toTimeInput,
} from "../../../interfaces/VehicleBookingHelpers";

interface VehicleBookingFormProps {
  title: string;
  subtitle: string;
  submitLabel: string;
  submittingLabel: string;
  offices: OfficeColumns[];
  booking?: VehicleBookingColumns | null;
  defaultRequestedBy?: string;
  defaultEmail?: string;
  defaultOfficeId?: number | null;
  onClose: () => void;
  onSubmit: (data: VehicleBookingFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

const labelClass =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

const buildInitialState = (
  booking?: VehicleBookingColumns | null,
  defaults?: {
    requestedBy?: string;
    email?: string;
    officeId?: number | null;
  },
) => ({
  destination: booking?.destination ?? "",
  purpose: booking?.purpose ?? "",
  remarks: booking?.remarks ?? "",
  travel_date: booking?.travel_date?.slice(0, 10) ?? "",
  expected_return_date: booking?.expected_return_date?.slice(0, 10) ?? "",
  departure_time: toTimeInput(booking?.departure_time),
  expected_return_time: toTimeInput(booking?.expected_return_time),
  passenger_count: booking ? String(booking.passenger_count ?? 1) : "1",
  passenger_details: booking?.passenger_details ?? "",
  requested_by: booking?.requested_by ?? defaults?.requestedBy ?? "",
  office_id: booking
    ? String(booking.office_id)
    : defaults?.officeId
      ? String(defaults.officeId)
      : "",
  email: booking?.email ?? defaults?.email ?? "",
  tel_number: booking?.tel_number ?? "",
});

const ErrorMessage = ({ message }: { message?: string }) => {
  if (!message) return null;

  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <FiAlertCircle size={13} />
      {message}
    </p>
  );
};

const VehicleBookingForm = ({
  title,
  subtitle,
  submitLabel,
  submittingLabel,
  offices,
  booking = null,
  defaultRequestedBy,
  defaultEmail,
  defaultOfficeId,
  onClose,
  onSubmit,
  isSubmitting = false,
}: VehicleBookingFormProps) => {
  const [formData, setFormData] = useState(() =>
    buildInitialState(booking, {
      requestedBy: defaultRequestedBy,
      email: defaultEmail,
      officeId: defaultOfficeId,
    }),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const today = getToday();

  const activeOffices = useMemo(
    () =>
      offices.filter(
        (office) =>
          (office.status === "active" && !office.is_deleted) ||
          office.office_id === booking?.office_id,
      ),
    [offices, booking?.office_id],
  );

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = (): boolean => {
    const next: Record<string, string> = {};

    if (!formData.destination.trim()) next.destination = "Destination is required.";
    if (!formData.purpose.trim()) next.purpose = "Purpose is required.";
    if (!formData.travel_date) next.travel_date = "Travel date is required.";
    else if (formData.travel_date < today) next.travel_date = "Travel date cannot be in the past.";
    if (!formData.expected_return_date) {
      next.expected_return_date = "Return date is required.";
    } else if (formData.expected_return_date < formData.travel_date) {
      next.expected_return_date = "Return date cannot be before travel date.";
    }
    if (!formData.departure_time) next.departure_time = "Departure time is required.";
    if (!formData.expected_return_time) {
      next.expected_return_time = "Return time is required.";
    }
    if (!formData.passenger_count || Number(formData.passenger_count) < 1) {
      next.passenger_count = "Passenger count must be at least 1.";
    }
    if (!formData.requested_by.trim()) next.requested_by = "Requestor name is required.";
    if (!formData.email.trim()) next.email = "Email is required.";
    if (!formData.tel_number.trim()) next.tel_number = "Contact number is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError("");

    if (!validateForm()) return;

    try {
      await onSubmit({
        destination: formData.destination.trim(),
        purpose: formData.purpose.trim(),
        remarks: formData.remarks.trim() || null,
        travel_date: formData.travel_date,
        expected_return_date: formData.expected_return_date,
        departure_time: formData.departure_time,
        expected_return_time: formData.expected_return_time,
        passenger_count: Number(formData.passenger_count),
        passenger_details: formData.passenger_details.trim() || null,
        requested_by: formData.requested_by.trim(),
        office_id: Number(formData.office_id || defaultOfficeId || 0),
        email: formData.email.trim(),
        tel_number: formData.tel_number.trim(),
      });
    } catch (error) {
      const parsed = parseApiError(error);
      setServerError(parsed.message);
      setErrors(parsed.fieldErrors);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl dark:bg-gray-950"
      >
        <div className="bg-linear-to-r from-[#003B5C] via-[#00679E] to-[#0095D9] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="mt-1 text-sm text-white/80">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <FiX size={21} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {serverError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Destination</label>
              <input
                className={inputClass}
                value={formData.destination}
                onChange={(event) => handleChange("destination", event.target.value)}
              />
              <ErrorMessage message={errors.destination} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Purpose</label>
              <input
                className={inputClass}
                value={formData.purpose}
                onChange={(event) => handleChange("purpose", event.target.value)}
              />
              <ErrorMessage message={errors.purpose} />
            </div>
            <div>
              <label className={labelClass}>Travel date</label>
              <input
                type="date"
                min={today}
                className={inputClass}
                value={formData.travel_date}
                onChange={(event) => handleChange("travel_date", event.target.value)}
              />
              <ErrorMessage message={errors.travel_date} />
            </div>
            <div>
              <label className={labelClass}>Departure time</label>
              <input
                type="time"
                className={inputClass}
                value={formData.departure_time}
                onChange={(event) => handleChange("departure_time", event.target.value)}
              />
              <ErrorMessage message={errors.departure_time} />
            </div>
            <div>
              <label className={labelClass}>Expected return date</label>
              <input
                type="date"
                min={formData.travel_date || today}
                className={inputClass}
                value={formData.expected_return_date}
                onChange={(event) =>
                  handleChange("expected_return_date", event.target.value)
                }
              />
              <ErrorMessage message={errors.expected_return_date} />
            </div>
            <div>
              <label className={labelClass}>Expected return time</label>
              <input
                type="time"
                className={inputClass}
                value={formData.expected_return_time}
                onChange={(event) =>
                  handleChange("expected_return_time", event.target.value)
                }
              />
              <ErrorMessage message={errors.expected_return_time} />
            </div>
            <div>
              <label className={labelClass}>Passenger count</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={formData.passenger_count}
                onChange={(event) => handleChange("passenger_count", event.target.value)}
              />
              <ErrorMessage message={errors.passenger_count} />
            </div>
            <div>
              <label className={labelClass}>Passenger details (optional)</label>
              <input
                className={inputClass}
                value={formData.passenger_details}
                onChange={(event) =>
                  handleChange("passenger_details", event.target.value)
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Remarks (optional)</label>
              <textarea
                rows={3}
                className={inputClass}
                value={formData.remarks}
                onChange={(event) => handleChange("remarks", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Requested by</label>
              <input
                className={inputClass}
                value={formData.requested_by}
                onChange={(event) => handleChange("requested_by", event.target.value)}
              />
              <ErrorMessage message={errors.requested_by} />
            </div>
            {activeOffices.length > 0 && (
              <div>
                <label className={labelClass}>Office</label>
                <select
                  className={inputClass}
                  value={formData.office_id}
                  onChange={(event) => handleChange("office_id", event.target.value)}
                >
                  <option value="">Select office</option>
                  {activeOffices.map((office) => (
                    <option key={office.office_id} value={office.office_id}>
                      {office.office_name}
                    </option>
                  ))}
                </select>
                <ErrorMessage message={errors.office_id} />
              </div>
            )}
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={inputClass}
                value={formData.email}
                onChange={(event) => handleChange("email", event.target.value)}
              />
              <ErrorMessage message={errors.email} />
            </div>
            <div>
              <label className={labelClass}>Contact number</label>
              <input
                className={inputClass}
                value={formData.tel_number}
                onChange={(event) => handleChange("tel_number", event.target.value)}
              />
              <ErrorMessage message={errors.tel_number} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-[#00679E] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <FiSave size={16} />
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleBookingForm;
