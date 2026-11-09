import { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { useModal } from "../../hooks/useModal";
import { useToast } from "../../contexts/ToastContext";
import VehicleService from "../../services/VehicleService";
import AddVehicleFormModal from "./components/AddVehicleFormModal";
import VehicleList from "./components/VehicleList";
import EditVehicleFormModal from "./components/EditVehicleFormModal";
import DeleteVehicleFormModal from "./components/DeleteVehicleFormModal";
import type { VehicleColumns } from "../../interfaces/VehicleColumns";
import { parseVehicleError } from "../../interfaces/VehicleHelpers";

const VehicleMainPage = () => {
  const {
    isOpen: isAddOpen,
    openModal: openAddModal,
    closeModal: closeAddModal,
  } = useModal(false);
  const {
    isOpen: isEditOpen,
    openModal: openEditModal,
    closeModal: closeEditModal,
  } = useModal(false);
  const {
    isOpen: isDeleteOpen,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
  } = useModal(false);

  const [vehicles, setVehicles] = useState<VehicleColumns[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleColumns | null>(
    null,
  );

  const { showToast } = useToast();

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await VehicleService.loadVehicles();

      // The API now returns { message, data } like the other modules
      setVehicles(response.data.data);
    } catch (error) {
      setLoadError(
        parseVehicleError(error, "Failed to load vehicles.").message,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const handleEditVehicle = (vehicle: VehicleColumns) => {
    setSelectedVehicle(vehicle);
    openEditModal();
  };

  const handleDeleteVehicle = (vehicle: VehicleColumns) => {
    setSelectedVehicle(vehicle);
    openDeleteModal();
  };

  return (
    <div className="space-y-6">
      <AddVehicleFormModal
        isOpen={isAddOpen}
        onClose={closeAddModal}
        onVehicleAdded={(message) => showToast(message)}
        refreshKey={loadVehicles}
      />

      <EditVehicleFormModal
        vehicle={selectedVehicle}
        isOpen={isEditOpen}
        onClose={closeEditModal}
        onVehicleUpdated={(message) => showToast(message)}
        refreshKey={loadVehicles}
      />

      <DeleteVehicleFormModal
        vehicle={selectedVehicle}
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        onDeleteVehicle={(message) => showToast(message)}
        refreshKey={loadVehicles}
      />

      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <p className="flex-1">{loadError}</p>

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
        onAddVehicle={openAddModal}
        onEditVehicle={handleEditVehicle}
        onDeleteVehicle={handleDeleteVehicle}
        onRefresh={loadVehicles}
      />
    </div>
  );
};

export default VehicleMainPage;
