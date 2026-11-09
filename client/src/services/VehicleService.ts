import AxiosInstance from "./AxiosInstance";

import type {
  VehicleListResponse,
  VehicleMessageResponse,
  VehicleResponse,
} from "../interfaces/VehicleColumns";

const VehicleService = {
  // Load all non-deleted vehicles
  loadVehicles: async () => {
    return await AxiosInstance.get<VehicleListResponse>(
      "/vehicles/loadVehicles",
    );
  },

  // Get a single vehicle
  getVehicle: async (vehicle_id: string | number) => {
    return await AxiosInstance.get<VehicleResponse>(
      `/vehicles/getVehicle/${vehicle_id}`,
    );
  },

  // Create a vehicle (FormData because of the optional image)
  storeVehicle: async (data: FormData) => {
    return await AxiosInstance.post<VehicleResponse>(
      "/vehicles/storeVehicle",
      data,
    );
  },

  // Update a vehicle.
  // PHP cannot read multipart data on a real PUT request, so this sends
  // POST with _method=PUT and Laravel routes it to the PUT route.
  updateVehicle: async (vehicle_id: string | number, data: FormData) => {
    data.set("_method", "PUT");

    return await AxiosInstance.post<VehicleResponse>(
      `/vehicles/updateVehicle/${vehicle_id}`,
      data,
    );
  },

  // Move vehicle to the Trash Bin
  destroyVehicle: async (vehicle_id: string | number) => {
    return await AxiosInstance.delete<VehicleMessageResponse>(
      `/vehicles/destroyVehicle/${vehicle_id}`,
    );
  },

  // Load vehicles in the Trash Bin
  loadTrashVehicles: async () => {
    return await AxiosInstance.get<VehicleListResponse>("/vehicles/trash");
  },

  // Restore a vehicle from the Trash Bin
  restoreVehicle: async (vehicle_id: string | number) => {
    return await AxiosInstance.put<VehicleResponse>(
      `/vehicles/restoreVehicle/${vehicle_id}`,
    );
  },

  // Permanently delete a vehicle (must be in the Trash Bin)
  forceDeleteVehicle: async (vehicle_id: string | number) => {
    return await AxiosInstance.delete<VehicleMessageResponse>(
      `/vehicles/forceDeleteVehicle/${vehicle_id}`,
    );
  },
};

export default VehicleService;
