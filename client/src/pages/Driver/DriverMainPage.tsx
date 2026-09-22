import { useState, useEffect, useCallback } from "react";
import { useModal } from "../../hooks/useModal";
import { useToast } from "../../contexts/ToastContext";
import type { DriverColumns } from "../../interfaces/DriverColumns";
import EditDriverFormModal from "./components/EditDriverFormModal";
import DeleteDriverFormModal from "./components/DeleteDriverFormModal";
import DriverList from "./components/DriverList";
import DriverService from "../../services/DriverService";
import AddDriverFormModal from "./components/AddDriverFornModal";

const DriverMainPage = () => {
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

  const [drivers, setDrivers] = useState<DriverColumns[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverColumns | null>(
    null,
  );

  const { showToast } = useToast();

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await DriverService.loadDrivers();
      setDrivers(response.data.drivers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const handleEditDriver = (driver: DriverColumns) => {
    setSelectedDriver(driver);
    openEditModal();
  };

  const handleDeleteDriver = (driver: DriverColumns) => {
    setSelectedDriver(driver);
    openDeleteModal();
  };

  return (
    <>
      <AddDriverFormModal
        isOpen={isAddOpen}
        onClose={closeAddModal}
        onDriverAdded={(message) => showToast(message)}
        refreshKey={loadDrivers}
      />

      <EditDriverFormModal
        driver={selectedDriver}
        isOpen={isEditOpen}
        onClose={closeEditModal}
        onDriverUpdated={(message) => showToast(message)}
        refreshKey={loadDrivers}
      />

      <DeleteDriverFormModal
        driver={selectedDriver}
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        onDeleteDriver={(message) => showToast(message)}
        refreshKey={loadDrivers}
      />

      <DriverList
        drivers={drivers}
        loading={loading}
        onAddDriver={openAddModal}
        onEditDriver={handleEditDriver}
        onDeleteDriver={handleDeleteDriver}
      />
    </>
  );
};

export default DriverMainPage;
