import { useEffect, useState, type FC, type FormEvent } from "react";
import { Wrench } from "lucide-react";

import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import VehicleMaintenanceService from "../../../services/VehicleMaintenanceService";
import type { VehicleColumns } from "../../../interfaces/VehicleColumns";
import type {
  MaintenanceFieldErrors,
  VehicleMaintenanceColumns,
} from "../../../interfaces/VehicleMaintenanceColumns";
import {
  emptyMaintenanceForm,
  getToday,
  maintenanceToForm,
  parseMaintenanceError,
  type MaintenanceFormValues,
} from "../../../interfaces/VehicleHelpers";
import { VehicleFormError } from "../../Vehicle/components/VehicleFormFields";

interface VehicleMaintenanceFormModalProps {
  // null = scheduling new maintenance
  record: VehicleMaintenanceColumns | null;
  vehicles: VehicleColumns[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  refreshKey: () => void;
}

const controlClass =
  "w-full rounded-xl border border-[#0095D9]/20 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0095D9] disabled:bg-gray-50 disabled:opacity-70";

const labelClass = "mb-1.5 block text-xs font-medium text-gray-500";

const FieldError: FC<{ messages?: string[] }> = ({ messages }) =>
  messages?.[0] ? (
    <p className="mt-1 text-xs text-red-500">{messages[0]}</p>
  ) : null;

const VehicleMaintenanceFormModal: FC<VehicleMaintenanceFormModalProps> = ({
  record,
  vehicles,
  isOpen,
  onClose,
  onSaved,
  refreshKey,
}) => {
  const isEdit = record !== null;

  const [form, setForm] = useState<MaintenanceFormValues>(emptyMaintenanceForm);
  const [errors, setErrors] = useState<MaintenanceFieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const today = getToday();

  // Start from the record (or a clean form) every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(record ? maintenanceToForm(record) : emptyMaintenanceForm);
      setErrors({});
      setServerError("");
    }
  }, [isOpen, record]);

  const handleChange = <K extends keyof MaintenanceFormValues>(
    field: K,
    value: MaintenanceFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isEdit && !form.vehicle_id) {
      setErrors({ vehicle_id: ["Please select a vehicle."] });
      return;
    }

    const payload = {
      reason: form.reason.trim(),
      notes: form.notes.trim() || null,
      date_start: form.date_start,
      date_end: form.date_end,
    };

    try {
      setSaving(true);
      setErrors({});
      setServerError("");

      const res = record
        ? await VehicleMaintenanceService.updateMaintenance(
            record.maintenance_id,
            payload,
          )
        : await VehicleMaintenanceService.storeMaintenance({
            vehicle_id: Number(form.vehicle_id),
            ...payload,
          });

      onSaved(res.data.message);
      refreshKey();
      onClose();
    } catch (error) {
      const { status, message, fieldErrors } = parseMaintenanceError(
        error,
        "Failed to save the maintenance record.",
      );

      if (status === 422) {
        setErrors(fieldErrors);
        // A record that is no longer scheduled cannot be edited
        setServerError(fieldErrors.status?.[0] ?? "");
      } else {
        setServerError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Wrench className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">
                {isEdit ? "Edit Maintenance" : "Schedule Maintenance"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                The vehicle can't be booked on these days. Requesters will be
                told it isn't available.
              </p>
            </div>
          </div>
        </div>

        <VehicleFormError message={serverError} />

        <div className="space-y-4 rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          {/* Vehicle */}
          <div>
            <label className={labelClass} htmlFor="maintenance_vehicle">
              Vehicle
            </label>

            <select
              id="maintenance_vehicle"
              value={form.vehicle_id}
              onChange={(e) => handleChange("vehicle_id", e.target.value)}
              disabled={isEdit}
              className={controlClass}
            >
              <option value="">Choose a vehicle</option>

              {vehicles.map((vehicle) => (
                <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                  {vehicle.vehicle_name} ({vehicle.plate_number})
                </option>
              ))}
            </select>

            {isEdit && (
              <p className="mt-1 text-xs text-gray-400">
                The vehicle can't be changed. Delete this record and schedule a
                new one instead.
              </p>
            )}

            <FieldError messages={errors.vehicle_id} />
          </div>

          <FloatingLabelInput
            label="Reason (e.g. Oil change)"
            type="text"
            name="reason"
            value={form.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
            errors={errors.reason}
            required
            autoFocus
          />

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="maintenance_start">
                First day out of service
              </label>

              <input
                id="maintenance_start"
                type="date"
                min={isEdit ? undefined : today}
                value={form.date_start}
                onChange={(e) => handleChange("date_start", e.target.value)}
                className={controlClass}
              />

              <FieldError messages={errors.date_start} />
            </div>

            <div>
              <label className={labelClass} htmlFor="maintenance_end">
                Last day out of service
              </label>

              <input
                id="maintenance_end"
                type="date"
                min={form.date_start || (isEdit ? undefined : today)}
                value={form.date_end}
                onChange={(e) => handleChange("date_end", e.target.value)}
                className={controlClass}
              />

              <FieldError messages={errors.date_end} />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Whole days, including both the first and the last day.
          </p>

          {/* Notes */}
          <div>
            <label className={labelClass} htmlFor="maintenance_notes">
              Notes
            </label>

            <textarea
              id="maintenance_notes"
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Optional details, e.g. the shop or technician"
              className={controlClass}
            />

            <FieldError messages={errors.notes} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#0095D9]/10 pt-4">
          {!saving && <CloseButton label="Cancel" onClose={onClose} />}

          <SubmitButton
            label={isEdit ? "Save Changes" : "Schedule Maintenance"}
            loading={saving}
            loadingLabel="Saving..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default VehicleMaintenanceFormModal;
