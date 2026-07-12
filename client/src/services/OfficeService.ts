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
};

export default OfficeService;
