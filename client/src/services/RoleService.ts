import AxiosInstance from "./AxiosInstance";
import type { RolePayload } from "../interfaces/RoleColumns";

const RoleService = {
  // Load all non-deleted roles (active and inactive)
  loadRoles: () => AxiosInstance.get("/roles/loadRoles"),

  // Load soft-deleted roles
  loadTrashRoles: () => AxiosInstance.get("/roles/trash"),

  // Get a specific role
  getRole: (role_id: string | number) =>
    AxiosInstance.get(`/roles/getRole/${role_id}`),

  // Create a role
  storeRole: (data: RolePayload) =>
    AxiosInstance.post("/roles/storeRole", data),

  // Update a role
  updateRole: (role_id: string | number, data: RolePayload) =>
    AxiosInstance.put(`/roles/updateRole/${role_id}`, data),

  // Activate a role
  activateRole: (role_id: string | number) =>
    AxiosInstance.put(`/roles/activateRole/${role_id}`),

  // Deactivate a role
  deactivateRole: (role_id: string | number) =>
    AxiosInstance.put(`/roles/deactivateRole/${role_id}`),

  // Soft-delete a role
  destroyRole: (role_id: string | number) =>
    AxiosInstance.delete(`/roles/destroyRole/${role_id}`),

  // Restore a deleted role
  restoreRole: (role_id: string | number) =>
    AxiosInstance.put(`/roles/restoreRole/${role_id}`),

  // Permanently delete a role
  forceDeleteRole: (role_id: string | number) =>
    AxiosInstance.delete(`/roles/forceDeleteRole/${role_id}`),
};

export default RoleService;
