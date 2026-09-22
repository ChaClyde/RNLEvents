import { useState, useEffect, useCallback } from "react";
import { useModal } from "../../hooks/useModal";
import { useToast } from "../../contexts/ToastContext";
import VehicleService from "../../services/VehicleService";
import AddVehicleFormModal from "./components/AddVehicleFormModal";
import VehicleList from "./components/VehicleList";
import EditVehicleFormModal from "./components/EditVehicleFormModal";
import DeleteVehicleFormModal from "./components/DeleteVehicleFormModal";
import type { VehicleColumns } from "../../interfaces/VehicleColumns";

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
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleColumns | null>(
    null,
  );

  const { showToast } = useToast();

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await VehicleService.loadVehicles();
      setVehicles(response.data.vehicles);
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
    <>
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

      <VehicleList
        vehicles={vehicles}
        loading={loading}
        onAddVehicle={openAddModal}
        onEditVehicle={handleEditVehicle}
        onDeleteVehicle={handleDeleteVehicle}
        onRefresh={loadVehicles}
      />
    </>
  );
};

export default VehicleMainPage;
