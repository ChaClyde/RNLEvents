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

  getRole: async (role_id: string | number) => {
    try {
      const response = await AxiosInstance.get(`/roles/getRole/${role_id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateRole: async (role_id: string | number, data: any) => {
    try {
      const response = await AxiosInstance.put(
        `/roles/updateRole/${role_id}`,
        data,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroyRole: async (role_id: string | number) => {
    try {
      const response = await AxiosInstance.put(`/roles/destroyRole/${role_id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};
export default RoleService;
