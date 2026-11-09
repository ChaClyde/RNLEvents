import { type FC, type FormEvent, useEffect, useState } from "react";
import { Trash2, Truck, Gauge, AlertTriangle, User } from "lucide-react";

import Modal from "../../../components/Modal";
import VehicleService from "../../../services/VehicleService";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import type { VehicleColumns } from "../../../interfaces/VehicleColumns";
import {
  getVehicleStatusLabel,
  getVehicleStatusStyle,
  parseVehicleError,
} from "../../../interfaces/VehicleHelpers";
import { VehicleFormError } from "./VehicleFormFields";

interface DeleteVehicleFormModalProps {
  vehicle: VehicleColumns | null;
  onDeleteVehicle: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const DeleteVehicleFormModal: FC<DeleteVehicleFormModalProps> = ({
  vehicle,
  onDeleteVehicle,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingDestroy, setLoadingDestroy] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (isOpen) setServerError("");
  }, [isOpen]);

  const handleDestroyVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;

    try {
      setLoadingDestroy(true);
      setServerError("");

      const res = await VehicleService.destroyVehicle(vehicle.vehicle_id);

      if (res.status === 200) {
        onDeleteVehicle(res.data.message);
        refreshKey();
        onClose();
      }
    } catch (error) {
      setServerError(
        parseVehicleError(error, "Failed to delete the vehicle.").message,
      );
    } finally {
      setLoadingDestroy(false);
    }
  };

  if (!isOpen || !vehicle) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleDestroyVehicle} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-red-50 p-6">
          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-red-500 p-3">
              <Trash2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Delete Vehicle
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                This vehicle will no longer be available for new bookings.
              </p>
            </div>
          </div>
        </div>

        <VehicleFormError message={serverError} />

        {/* Big image + name */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="h-64 w-full bg-gray-100">
            {vehicle.image_url ? (
              <img
                src={vehicle.image_url}
                alt={vehicle.vehicle_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <Truck size={48} />
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-3 p-6">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900">
                {vehicle.vehicle_name}
              </h2>
              <p className="mt-1 text-sm tracking-wide text-gray-500">
                Plate No. {vehicle.plate_number}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getVehicleStatusStyle(
                vehicle.status,
              )}`}
            >
              {getVehicleStatusLabel(vehicle.status)}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Gauge className="text-[#0095D9]" size={18} />
              <h3 className="font-semibold text-gray-900">Type</h3>
            </div>
            <p className="text-lg font-medium text-[#003B5C]">
              {vehicle.vehicle_type ?? "—"}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Truck className="text-[#003B5C]" size={18} />
              <h3 className="font-semibold text-gray-900">Seating</h3>
            </div>
            <p className="text-lg font-medium text-gray-900">
              {vehicle.capacity} seats
            </p>
            {vehicle.seating_notes && (
              <p className="mt-1 text-xs text-gray-500">
                {vehicle.seating_notes}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <User className="text-[#0095D9]" size={18} />
              <h3 className="font-semibold text-gray-900">Person in Charge</h3>
            </div>
            <p className="text-lg font-medium text-gray-900">
              {vehicle.person_in_charge ?? "—"}
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            This moves the vehicle to the Trash Bin. Existing booking records
            keep their details, but the vehicle won't be selectable for new
            bookings. You can restore it later.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          {!loadingDestroy && <CloseButton label="Cancel" onClose={onClose} />}

          <SubmitButton
            label="Delete Vehicle"
            loading={loadingDestroy}
            loadingLabel="Deleting..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default DeleteVehicleFormModal;
