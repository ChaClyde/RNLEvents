import AxiosInstance from "./AxiosInstance";
import type { UserPayload } from "../interfaces/UserColumns";

const UserService = {
  // Load users
  loadUsers: (params?: {
    search?: string;
    role_id?: number | string;
    office_id?: number | string;
    account_status?: "Active" | "Inactive";
  }) => AxiosInstance.get("/users/loadUsers", { params }),

  // Get a specific user
  getUser: (user_id: string | number) =>
    AxiosInstance.get(`/users/getUser/${user_id}`),

  // Create user
  storeUser: (data: FormData | UserPayload) =>
    AxiosInstance.post("/users/storeUser", data),

  // Update user
  updateUser: (user_id: string | number, data: Partial<UserPayload>) =>
    AxiosInstance.put(`/users/updateUser/${user_id}`, data),

  // Reset password
  resetPassword: (
    user_id: string | number,
    data: {
      password: string;
      password_confirmation: string;
    },
  ) => AxiosInstance.put(`/users/resetPassword/${user_id}`, data),

  // Move user to trash
  destroyUser: (user_id: string | number) =>
    AxiosInstance.delete(`/users/destroyUser/${user_id}`),

  // Load trash
  loadTrashUsers: () => AxiosInstance.get("/users/trash"),

  // Restore user
  restoreUser: (user_id: string | number) =>
    AxiosInstance.put(`/users/restoreUser/${user_id}`),

  // Permanently delete user
  forceDeleteUser: (user_id: string | number) =>
    AxiosInstance.delete(`/users/forceDeleteUser/${user_id}`),

  // Upload profile photo
  uploadProfilePhoto: (user_id: string | number, data: FormData) =>
    AxiosInstance.post(`/users/uploadProfilePhoto/${user_id}`, data),

  // Get profile photo
  getProfilePhoto: (user_id: string | number) =>
    AxiosInstance.get(`/users/getProfilePhoto/${user_id}`),

  // Remove profile photo
  removeProfilePhoto: (user_id: string | number) =>
    AxiosInstance.delete(`/users/removeProfilePhoto/${user_id}`),

  // Update own profile
  updateProfile: (data: Record<string, unknown>) =>
    AxiosInstance.put("/users/updateProfile", data),

  // Update activity heartbeat
  heartbeat: () => AxiosInstance.post("/users/heartbeat"),
};

export default UserService;
