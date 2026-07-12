import AxiosInstance from "./AxiosInstance";

const RoleService = {
  loadRoles: async () => {
    try {
      const response = await AxiosInstance.get("/roles/loadRoles");
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeRole: async (data: any) => {
    try {
      const response = await AxiosInstance.post("/roles/storeRole", data);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default RoleService;
