import AxiosInstance from "./AxiosInstance";

import type {
  DriverFilters,
  DriverFormData,
  DriverListResponse,
  DriverMessageResponse,
  DriverResponse,
} from "../interfaces/DriverColumns";

const DriverService = {
  // Load all non-deleted drivers.
  // Pass { available_on: "YYYY-MM-DD" } to get only assignable drivers.
  loadDrivers: async (filters?: DriverFilters) => {
    return await AxiosInstance.get<DriverListResponse>("/drivers/loadDrivers", {
      params: filters,
    });
  },

  // Get a single driver
  getDriver: async (driver_id: string | number) => {
    return await AxiosInstance.get<DriverResponse>(
      `/drivers/getDriver/${driver_id}`,
    );
  },

  // Create a driver
  storeDriver: async (data: DriverFormData) => {
    return await AxiosInstance.post<DriverResponse>(
      "/drivers/storeDriver",
      data,
    );
  },

  // Update a driver
  updateDriver: async (
    driver_id: string | number,
    data: Partial<DriverFormData>,
  ) => {
    return await AxiosInstance.put<DriverResponse>(
      `/drivers/updateDriver/${driver_id}`,
      data,
    );
  },

  // Move a driver to the Trash Bin
  destroyDriver: async (driver_id: string | number) => {
    return await AxiosInstance.delete<DriverMessageResponse>(
      `/drivers/destroyDriver/${driver_id}`,
    );
  },

  // Load drivers in the Trash Bin
  loadTrashDrivers: async () => {
    return await AxiosInstance.get<DriverListResponse>("/drivers/trash");
  },

  // Restore a driver from the Trash Bin
  restoreDriver: async (driver_id: string | number) => {
    return await AxiosInstance.put<DriverResponse>(
      `/drivers/restoreDriver/${driver_id}`,
    );
  },

  // Permanently delete a driver (must be in the Trash Bin)
  forceDeleteDriver: async (driver_id: string | number) => {
    return await AxiosInstance.delete<DriverMessageResponse>(
      `/drivers/forceDeleteDriver/${driver_id}`,
    );
  },
};

export default DriverService;
