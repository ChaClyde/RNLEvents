import AxiosInstance from "./AxiosInstance";

const VehicleService = {
  loadVehicles: async () => {
    try {
      const response = await AxiosInstance.get("/vehicles/loadVehicles");
      return response;
    } catch (error) {
      throw error;
    }
  },

  getVehicle: async (vehicle_id: string | number) => {
    try {
      const response = await AxiosInstance.get(
        `/vehicles/getVehicle/${vehicle_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeVehicle: async (data: FormData) => {
    try {
      const response = await AxiosInstance.post("/vehicles/storeVehicle", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateVehicle: async (vehicle_id: string | number, data: FormData) => {
    try {
      data.append("_method", "PUT");
      const response = await AxiosInstance.post(
        `/vehicles/updateVehicle/${vehicle_id}`,
        data,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroyVehicle: async (vehicle_id: string | number) => {
    try {
      const response = await AxiosInstance.put(
        `/vehicles/destroyVehicle/${vehicle_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  loadTrashVehicles: async () => {
    try {
      const response = await AxiosInstance.get("/vehicles/trash");
      return response;
    } catch (error) {
      throw error;
    }
  },

  restoreVehicle: async (vehicle_id: string | number) => {
    try {
      const response = await AxiosInstance.put(
        `/vehicles/restoreVehicle/${vehicle_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  forceDeleteVehicle: async (vehicle_id: string | number) => {
    try {
      const response = await AxiosInstance.delete(
        `/vehicles/forceDeleteVehicle/${vehicle_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default VehicleService;
