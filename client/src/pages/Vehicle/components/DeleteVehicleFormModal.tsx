import { type FC, type FormEvent, useState } from "react";
import Modal from "../../../components/Modal";
import VehicleService from "../../../services/VehicleService";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import { Trash2, Truck, Gauge, AlertTriangle } from "lucide-react";
import type { VehicleColumns } from "../../../interfaces/VehicleColumns";

interface DeleteVehicleFormModalProps {
  vehicle: VehicleColumns | null;
  onDeleteVehicle: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

const DeleteVehicleFormModal: FC<DeleteVehicleFormModalProps> = ({
  vehicle,
  onDeleteVehicle,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingDestroy, setLoadingDestroy] = useState(false);

  const handleDestroyVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    try {
      setLoadingDestroy(true);
      const res = await VehicleService.destroyVehicle(vehicle.vehicle_id);
      if (res.status === 200) {
        onDeleteVehicle(res.data.message);
        refreshKey();
        onClose();
      } else {
        console.error("Unexpected error:", res.status);
      }
    } catch (error) {
      console.error("Delete error:", error);
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
              <p className="text-sm text-gray-500 mt-1">
                This vehicle will no longer be available when scheduling events.
              </p>
            </div>
          </div>
        </div>

        {/* Big image + name */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="h-64 w-full bg-gray-100">
            {vehicle.image_path ? (
              <img
                src={`${backendUrl}/api/vehicles/getVehicleImage/${vehicle.vehicle_id}`}
                alt={vehicle.vehicle_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <Truck size={48} />
              </div>
            )}
          </div>

          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900">
              {vehicle.vehicle_name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Maintenance: {vehicle.vehicle_maintenance ?? "—"}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Gauge className="text-[#0095D9]" size={18} />
              <h3 className="font-semibold text-gray-900">Type</h3>
            </div>
            <p className="text-lg font-medium text-[#003B5C]">
              {vehicle.vehicle_type ?? "—"}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Truck className="text-[#003B5C]" size={18} />
              <h3 className="font-semibold text-gray-900">Capacity</h3>
            </div>
            <p className="text-lg font-medium text-gray-900">
              {vehicle.capacity ?? "—"}
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">
            This removes the vehicle from the active list. Any events already
            using it will keep their record, but it won't be selectable for new
            events.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
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
