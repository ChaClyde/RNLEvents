import AxiosInstance from "./AxiosInstance";
import type { OfficePayload } from "../interfaces/OfficeColumns";

const OfficeService = {
  // Load all non-deleted offices
  loadOffices: () => AxiosInstance.get("/offices/loadOffices"),

  // Get a specific office
  getOffice: (office_id: string | number) =>
    AxiosInstance.get(`/offices/getOffice/${office_id}`),

  // Create an office
  storeOffice: (data: OfficePayload) =>
    AxiosInstance.post("/offices/storeOffice", data),

  // Update an office
  updateOffice: (office_id: string | number, data: OfficePayload) =>
    AxiosInstance.put(`/offices/updateOffice/${office_id}`, data),

  // Activate office
  activateOffice: (office_id: string | number) =>
    AxiosInstance.put(`/offices/activateOffice/${office_id}`),

  // Deactivate office
  deactivateOffice: (office_id: string | number) =>
    AxiosInstance.put(`/offices/deactivateOffice/${office_id}`),

  // Move office to Trash
  destroyOffice: (office_id: string | number) =>
    AxiosInstance.delete(`/offices/destroyOffice/${office_id}`),

  // ==============================
  // TRASH BIN
  // ==============================

  // Load deleted offices
  loadTrashOffices: () => AxiosInstance.get("/offices/trash"),

  // Restore deleted office
  restoreOffice: (office_id: string | number) =>
    AxiosInstance.put(`/offices/restoreOffice/${office_id}`),

  // Permanently delete office
  forceDeleteOffice: (office_id: string | number) =>
    AxiosInstance.delete(`/offices/forceDeleteOffice/${office_id}`),
};

export default OfficeService;
