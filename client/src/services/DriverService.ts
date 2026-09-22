import AxiosInstance from "./AxiosInstance";

const DriverService = {
  loadDrivers: async () => {
    try {
      const response = await AxiosInstance.get("/drivers/loadDrivers");
      return response;
    } catch (error) {
      throw error;
    }
  },

  getDriver: async (driver_id: string | number) => {
    try {
      const response = await AxiosInstance.get(
        `/drivers/getDriver/${driver_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeDriver: async (data: Record<string, any>) => {
    try {
      const response = await AxiosInstance.post("/drivers/storeDriver", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateDriver: async (
    driver_id: string | number,
    data: Record<string, any>,
  ) => {
    try {
      const response = await AxiosInstance.put(
        `/drivers/updateDriver/${driver_id}`,
        data,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroyDriver: async (driver_id: string | number) => {
    try {
      const response = await AxiosInstance.delete(
        `/drivers/destroyDriver/${driver_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  loadTrashDrivers: async () => {
    try {
      const response = await AxiosInstance.get("/drivers/loadTrashDrivers");
      return response;
    } catch (error) {
      throw error;
    }
  },

  restoreDriver: async (driver_id: string | number) => {
    try {
      const response = await AxiosInstance.put(
        `/drivers/restoreDriver/${driver_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  forceDeleteDriver: async (driver_id: string | number) => {
    try {
      const response = await AxiosInstance.delete(
        `/drivers/forceDeleteDriver/${driver_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default DriverService;
