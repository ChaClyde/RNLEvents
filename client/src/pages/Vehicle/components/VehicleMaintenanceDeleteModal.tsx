import { useEffect, useState, type FC, type FormEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";

import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import VehicleMaintenanceService from "../../../services/VehicleMaintenanceService";
import type { VehicleMaintenanceColumns } from "../../../interfaces/VehicleMaintenanceColumns";
import {
  formatDateRange,
  getMaintenancePhaseLabel,
  getMaintenancePhaseStyle,
  parseMaintenanceError,
} from "../../../interfaces/VehicleHelpers";
import { VehicleFormError } from "../../Vehicle/components/VehicleFormFields";

interface VehicleMaintenanceDeleteModalProps {
  record: VehicleMaintenanceColumns | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (message: string) => void;
  refreshKey: () => void;
}

const VehicleMaintenanceDeleteModal: FC<VehicleMaintenanceDeleteModalProps> = ({
  record,
  isOpen,
  onClose,
  onDeleted,
  refreshKey,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (isOpen) setServerError("");
  }, [isOpen]);

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (!record) return;

    try {
      setDeleting(true);
      setServerError("");

      const res = await VehicleMaintenanceService.destroyMaintenance(
        record.maintenance_id,
      );

      onDeleted(res.data.message);
      refreshKey();
      onClose();
    } catch (error) {
      setServerError(
        parseMaintenanceError(error, "Failed to delete the maintenance record.")
          .message,
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !record) return null;

  // Only scheduled records block the vehicle
  const blocksVehicle = record.status === "scheduled";

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleDelete} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-red-50 p-6">
          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-red-500 p-3">
              <Trash2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Delete Maintenance
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                This removes the record from the sheet for good.
              </p>
            </div>
          </div>
        </div>

        <VehicleFormError message={serverError} />

        {/* Record */}
        <div className="space-y-3 rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Wrench size={18} className="text-[#0095D9]" />
                {record.reason}
              </h2>
              {record.notes && (
                <p className="mt-1 text-sm text-gray-500">{record.notes}</p>
              )}
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getMaintenancePhaseStyle(
                record.phase,
              )}`}
            >
              {getMaintenancePhaseLabel(record.phase)}
            </span>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-3 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <Truck size={15} className="shrink-0 text-[#0095D9]" />
              {record.vehicle?.vehicle_name ?? "Vehicle unavailable"}
              {record.vehicle ? ` (${record.vehicle.plate_number})` : ""}
            </p>

            <p className="flex items-center gap-2">
              <CalendarDays size={15} className="shrink-0 text-[#0095D9]" />
              {formatDateRange(record.date_start, record.date_end)}
            </p>
          </div>
        </div>

        {blocksVehicle ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <p className="text-sm text-amber-800">
              This maintenance is still scheduled. Deleting it makes the vehicle
              bookable again on these dates. If the work was finished early, use
              "Mark done" instead so the record is kept.
            </p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          {!deleting && <CloseButton label="Cancel" onClose={onClose} />}

          <SubmitButton
            label="Delete Record"
            loading={deleting}
            loadingLabel="Deleting..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default VehicleMaintenanceDeleteModal;
