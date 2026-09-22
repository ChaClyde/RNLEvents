import AxiosInstance from "./AxiosInstance";

const UserService = {
  loadUsers: async () => {
    try {
      const response = await AxiosInstance.get("/users/loadUsers");
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeUser: async (data: Record<string, any>) => {
    try {
      const response = await AxiosInstance.post("/users/storeUser", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getUser: async (user_id: string | number) => {
    try {
      const response = await AxiosInstance.get(`/users/getUser/${user_id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (user_id: string | number, data: Record<string, any>) => {
    try {
      const response = await AxiosInstance.put(
        `/users/updateUser/${user_id}`,
        data,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroyUser: async (user_id: string | number) => {
    try {
      const response = await AxiosInstance.delete(
        `/users/destroyUser/${user_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  loadTrashUsers: async () => {
    try {
      const response = await AxiosInstance.get("/users/loadTrashUsers");
      return response;
    } catch (error) {
      throw error;
    }
  },

  restoreUser: async (user_id: string | number) => {
    try {
      const response = await AxiosInstance.put(`/users/restoreUser/${user_id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  forceDeleteUser: async (user_id: string | number) => {
    try {
      const response = await AxiosInstance.delete(
        `/users/forceDeleteUser/${user_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  uploadProfilePhoto: async (user_id: string | number, data: FormData) => {
    try {
      const response = await AxiosInstance.post(
        `/users/uploadProfilePhoto/${user_id}`,
        data,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  removeProfilePhoto: async (user_id: string | number) => {
    try {
      const response = await AxiosInstance.delete(
        `/users/removeProfilePhoto/${user_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateProfile: async (data: Record<string, any>) => {
    try {
      const response = await AxiosInstance.put("/users/updateProfile", data);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default UserService;
