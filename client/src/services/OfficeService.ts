import AxiosInstance from "./AxiosInstance";

const OfficeService = {
  loadOffices: async () => {
    try {
      const response = await AxiosInstance.get("/offices/loadOffices");
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeOffice: async (data: any) => {
    try {
      const response = await AxiosInstance.post("/offices/storeOffice", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getOffice: async (office_id: string | number) => {
    try {
      const response = await AxiosInstance.get(
        `/offices/getOffice/${office_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateOffice: async (office_id: string | number, data: any) => {
    try {
      const response = await AxiosInstance.put(
        `/offices/updateOffice/${office_id}`,
        data,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroyOffice: async (office_id: string | number) => {
    try {
      const response = await AxiosInstance.put(
        `/offices/destroyOffice/${office_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default OfficeService;
