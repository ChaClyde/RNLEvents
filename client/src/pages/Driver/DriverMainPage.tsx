import { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { useModal } from "../../hooks/useModal";
import { useToast } from "../../contexts/ToastContext";
import type { DriverColumns } from "../../interfaces/DriverColumns";
import type { VehicleColumns } from "../../interfaces/VehicleColumns";
import { parseApiErrors } from "../../interfaces/ApiErrorHelpers";
import DriverService from "../../services/DriverService";
import VehicleService from "../../services/VehicleService";
import EditDriverFormModal from "./components/EditDriverFormModal";
import DeleteDriverFormModal from "./components/DeleteDriverFormModal";
import DriverList from "./components/DriverList";
import AddDriverFormModal from "./components/AddDriverFormModal";

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
  const [vehicles, setVehicles] = useState<VehicleColumns[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<DriverColumns | null>(
    null,
  );

  const { showToast } = useToast();

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await DriverService.loadDrivers();

      // The API now returns { message, data } like the other modules
      setDrivers(response.data.data);
    } catch (error) {
      setLoadError(parseApiErrors(error, "Failed to load drivers.").message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Used by the "Usual Vehicle" dropdown in the forms
  const loadVehicles = useCallback(async () => {
    try {
      const response = await VehicleService.loadVehicles();
      setVehicles(response.data.data);
    } catch {
      // The forms still work without the list; the vehicle field is optional
    }
  }, []);

  useEffect(() => {
    loadDrivers();
    loadVehicles();
  }, [loadDrivers, loadVehicles]);

  const handleEditDriver = (driver: DriverColumns) => {
    setSelectedDriver(driver);
    openEditModal();
  };

  const handleDeleteDriver = (driver: DriverColumns) => {
    setSelectedDriver(driver);
    openDeleteModal();
  };

  return (
    <div className="space-y-6">
      <AddDriverFormModal
        vehicles={vehicles}
        isOpen={isAddOpen}
        onClose={closeAddModal}
        onDriverAdded={(message) => showToast(message)}
        refreshKey={loadDrivers}
      />

      <EditDriverFormModal
        driver={selectedDriver}
        vehicles={vehicles}
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

      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <p className="flex-1">{loadError}</p>

          <button
            type="button"
            onClick={loadDrivers}
            className="flex shrink-0 items-center gap-1.5 font-semibold underline"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      <DriverList
        drivers={drivers}
        loading={loading}
        onAddDriver={openAddModal}
        onEditDriver={handleEditDriver}
        onDeleteDriver={handleDeleteDriver}
      />
    </div>
  );
};

export default DriverMainPage;
