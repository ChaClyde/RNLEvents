import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { useModal } from "../../hooks/useModal";
import { useToast } from "../../contexts/ToastContext";
import VehicleService from "../../services/VehicleService";
import type { VehicleColumns } from "../../interfaces/VehicleColumns";
import { parseVehicleError } from "../../interfaces/VehicleHelpers";

import VehicleList from "./components/VehicleList";
import AddVehicleFormModal from "./components/AddVehicleFormModal";
import EditVehicleFormModal from "./components/EditVehicleFormModal";
import DeleteVehicleFormModal from "./components/DeleteVehicleFormModal";

const VehicleMainPage = () => {
  const add = useModal(false);
  const edit = useModal(false);
  const del = useModal(false);

  const [vehicles, setVehicles] = useState<VehicleColumns[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [selected, setSelected] = useState<VehicleColumns | null>(null);

  const { showToast } = useToast();

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const res = await VehicleService.loadVehicles();
      setVehicles(res.data.data);
    } catch (error) {
      setPageError(
        parseVehicleError(error, "Failed to load vehicles.").message,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  return (
    <div className="space-y-6">
      <AddVehicleFormModal
        isOpen={add.isOpen}
        onClose={add.closeModal}
        onVehicleAdded={(message: string) => showToast(message)}
        refreshKey={loadVehicles}
      />

      <EditVehicleFormModal
        vehicle={selected}
        isOpen={edit.isOpen}
        onClose={edit.closeModal}
        onVehicleUpdated={(message) => showToast(message)}
        refreshKey={loadVehicles}
      />

      <DeleteVehicleFormModal
        vehicle={selected}
        isOpen={del.isOpen}
        onClose={del.closeModal}
        onDeleteVehicle={(message) => showToast(message)}
        refreshKey={loadVehicles}
      />

      {pageError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">{pageError}</p>
          <button
            type="button"
            onClick={loadVehicles}
            className="flex shrink-0 items-center gap-1.5 font-semibold underline"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      <VehicleList
        vehicles={vehicles}
        loading={loading}
        onAddVehicle={add.openModal}
        onEditVehicle={(vehicle) => {
          setSelected(vehicle);
          edit.openModal();
        }}
        onDeleteVehicle={(vehicle) => {
          setSelected(vehicle);
          del.openModal();
        }}
        onRefresh={loadVehicles}
      />
    </div>
  );
};

export default VehicleMainPage;
