import AxiosInstance from "./AxiosInstance";

import type {
  MaintenanceStatus,
  VehicleMaintenanceFilters,
  VehicleMaintenanceFormData,
  VehicleMaintenanceListResponse,
  VehicleMaintenanceMessageResponse,
  VehicleMaintenanceResponse,
  VehicleMaintenanceUpdateData,
} from "../interfaces/VehicleMaintenanceColumns";

const VehicleMaintenanceService = {
  // Load the maintenance sheet
  loadMaintenance: async (filters?: VehicleMaintenanceFilters) => {
    return await AxiosInstance.get<VehicleMaintenanceListResponse>(
      "/vehicle-maintenance",
      { params: filters },
    );
  },

  // Get a single maintenance record
  getMaintenance: async (maintenance_id: string | number) => {
    return await AxiosInstance.get<VehicleMaintenanceResponse>(
      `/vehicle-maintenance/${maintenance_id}`,
    );
  },

  // Schedule maintenance for a vehicle
  storeMaintenance: async (data: VehicleMaintenanceFormData) => {
    return await AxiosInstance.post<VehicleMaintenanceResponse>(
      "/vehicle-maintenance/storeMaintenance",
      data,
    );
  },

  // Update a scheduled record (reason, notes and dates)
  updateMaintenance: async (
    maintenance_id: string | number,
    data: VehicleMaintenanceUpdateData,
  ) => {
    return await AxiosInstance.put<VehicleMaintenanceResponse>(
      `/vehicle-maintenance/updateMaintenance/${maintenance_id}`,
      data,
    );
  },

  // Complete, cancel or reopen a record.
  // Completing or cancelling frees the vehicle immediately.
  updateMaintenanceStatus: async (
    maintenance_id: string | number,
    status: MaintenanceStatus,
  ) => {
    return await AxiosInstance.put<VehicleMaintenanceResponse>(
      `/vehicle-maintenance/updateStatus/${maintenance_id}`,
      { status },
    );
  },

  // Delete a record
  destroyMaintenance: async (maintenance_id: string | number) => {
    return await AxiosInstance.delete<VehicleMaintenanceMessageResponse>(
      `/vehicle-maintenance/destroyMaintenance/${maintenance_id}`,
    );
  },
};

export default VehicleMaintenanceService;
