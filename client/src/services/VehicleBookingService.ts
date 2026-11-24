import AxiosInstance from "./AxiosInstance";

import type {
  VehicleBooking,
  VehicleBookingApiResponse,
  VehicleBookingAssignment,
  VehicleBookingFormData,
  VehicleBookingListParams,
  VehicleBookingStatusData,
  VehicleBookingVehicle,
  VehicleBookingDriver,
} from "../interfaces/VehicleBookingColumns";

const BASE_URL = "/vehicle-bookings";
const AVAILABILITY_URL = "/availability";

const VehicleBookingService = {
  // Get all vehicle bookings
  async awaitingMyApproval() {
    const response = await AxiosInstance.get<
      VehicleBookingApiResponse<VehicleBooking[]>
    >(`${BASE_URL}/awaiting-my-approval`);

    return response.data.data;
  },

  async getAll(params?: VehicleBookingListParams) {
    const response = await AxiosInstance.get<
      VehicleBookingApiResponse<VehicleBooking[]>
    >(BASE_URL, { params });

    return response.data;
  },

  // Get a single vehicle booking
  async getById(id: number) {
    const response = await AxiosInstance.get<
      VehicleBookingApiResponse<VehicleBooking>
    >(`${BASE_URL}/${id}`);

    return response.data;
  },

  // Create a vehicle booking
  async create(data: VehicleBookingFormData) {
    const response = await AxiosInstance.post<
      VehicleBookingApiResponse<VehicleBooking>
    >(`${BASE_URL}/storeVehicleBooking`, data);

    return response.data;
  },

  // Update a vehicle booking
  async update(id: number, data: VehicleBookingFormData) {
    const response = await AxiosInstance.put<
      VehicleBookingApiResponse<VehicleBooking>
    >(`${BASE_URL}/updateVehicleBooking/${id}`, data);

    return response.data;
  },

  // Delete a vehicle booking
  async delete(id: number) {
    const response = await AxiosInstance.delete(
      `${BASE_URL}/destroyVehicleBooking/${id}`,
    );

    return response.data;
  },

  // Update booking status
  async updateStatus(id: number, data: VehicleBookingStatusData) {
    const response = await AxiosInstance.put<
      VehicleBookingApiResponse<VehicleBooking>
    >(`${BASE_URL}/updateStatus/${id}`, data);

    return response.data;
  },

  async updateCharges(
    id: number,
    payload: {
      confirm: boolean;
      lines: {
        id: string;
        label: string;
        quantity: number;
        unit_amount: number;
        removable: boolean;
      }[];
    },
  ) {
    const response = await AxiosInstance.put<
      VehicleBookingApiResponse<VehicleBooking>
    >(`${BASE_URL}/charges/${id}`, payload);
    return response.data;
  },

  // Assign vehicle and driver
  async assign(id: number, data: VehicleBookingAssignment) {
    const response = await AxiosInstance.put<
      VehicleBookingApiResponse<VehicleBooking>
    >(`${BASE_URL}/assign/${id}`, data);

    return response.data;
  },

  // Get deleted bookings
  async getTrash() {
    const response = await AxiosInstance.get<
      VehicleBookingApiResponse<VehicleBooking[]>
    >(`${BASE_URL}/trash`);

    return response.data;
  },

  // Restore deleted booking
  async restore(id: number) {
    const response = await AxiosInstance.put<
      VehicleBookingApiResponse<VehicleBooking>
    >(`${BASE_URL}/restoreVehicleBooking/${id}`);

    return response.data;
  },

  // Permanently delete booking
  async forceDelete(id: number) {
    const response = await AxiosInstance.delete(
      `${BASE_URL}/forceDeleteVehicleBooking/${id}`,
    );

    return response.data;
  },

  // Get available vehicles
  async getVehicles() {
    const response = await AxiosInstance.get<
      VehicleBookingApiResponse<VehicleBookingVehicle[]>
    >("/vehicles/loadVehicles");

    return response.data;
  },

  async getDrivers() {
    const response = await AxiosInstance.get<
      VehicleBookingApiResponse<VehicleBookingDriver[]>
    >("/drivers/loadDrivers");

    return response.data;
  },

  async uploadLetter(id: number, file: File) {
    const body = new FormData();
    body.append("file", file);
    const response = await AxiosInstance.post<
      VehicleBookingApiResponse<unknown>
    >(`${BASE_URL}/${id}/attachments`, body);
    return response.data;
  },

  previewSlip(id: number) {
    return AxiosInstance.get(`${BASE_URL}/${id}/booking-slip/preview`, {
      responseType: "blob",
    });
  },

  downloadSlip(id: number) {
    return AxiosInstance.get(`${BASE_URL}/${id}/booking-slip/download`, {
      responseType: "blob",
    });
  },

  previewLetter(bookingId: number, attachmentId: number) {
    return AxiosInstance.get(
      `${BASE_URL}/${bookingId}/attachments/${attachmentId}/preview`,
      { responseType: "blob" },
    );
  },

  downloadLetter(bookingId: number, attachmentId: number) {
    return AxiosInstance.get(
      `${BASE_URL}/${bookingId}/attachments/${attachmentId}/download`,
      { responseType: "blob" },
    );
  },

  loadResourceMonth(kind: "vehicles" | "drivers", id: number, month: string) {
    return AxiosInstance.get(`${AVAILABILITY_URL}/${kind}/${id}/calendar`, {
      params: { month },
    });
  },

  loadResourceDay(kind: "vehicles" | "drivers", id: number, date: string) {
    return AxiosInstance.get(`${AVAILABILITY_URL}/${kind}/${id}/day`, {
      params: { date },
    });
  },

  // Get vehicle image
  async getVehicleImage(vehicleId: number): Promise<string> {
    const response = await AxiosInstance.get(
      `/vehicles/getVehicleImage/${vehicleId}`,
      { responseType: "blob" },
    );

    return URL.createObjectURL(response.data);
  },

  // Get driver image
  async getDriverImage(driverId: number): Promise<string> {
    const response = await AxiosInstance.get(
      `/drivers/getDriverImage/${driverId}`,
      { responseType: "blob" },
    );

    return URL.createObjectURL(response.data);
  },
};

export default VehicleBookingService;
