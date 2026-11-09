import AxiosInstance from "./AxiosInstance";

import type {
  VehicleBookingAssignmentData,
  VehicleBookingFormData,
  VehicleBookingListResponse,
  VehicleBookingMessageResponse,
  VehicleBookingResponse,
  VehicleBookingStatusData,
} from "../interfaces/VehicleBookingColumns";

const VehicleBookingService = {
  loadVehicleBookings: async () => {
    return await AxiosInstance.get<VehicleBookingListResponse>(
      "/vehicle-bookings",
    );
  },

  getVehicleBooking: async (vehicle_booking_id: string | number) => {
    return await AxiosInstance.get<VehicleBookingResponse>(
      `/vehicle-bookings/${vehicle_booking_id}`,
    );
  },

  storeVehicleBooking: async (data: VehicleBookingFormData) => {
    return await AxiosInstance.post<VehicleBookingResponse>(
      "/vehicle-bookings/storeVehicleBooking",
      data,
    );
  },

  updateVehicleBooking: async (
    vehicle_booking_id: string | number,
    data: VehicleBookingFormData,
  ) => {
    return await AxiosInstance.put<VehicleBookingResponse>(
      `/vehicle-bookings/updateVehicleBooking/${vehicle_booking_id}`,
      data,
    );
  },

  destroyVehicleBooking: async (vehicle_booking_id: string | number) => {
    return await AxiosInstance.delete<VehicleBookingMessageResponse>(
      `/vehicle-bookings/destroyVehicleBooking/${vehicle_booking_id}`,
    );
  },

  updateVehicleBookingStatus: async (
    vehicle_booking_id: string | number,
    data: VehicleBookingStatusData,
  ) => {
    return await AxiosInstance.put<VehicleBookingResponse>(
      `/vehicle-bookings/updateStatus/${vehicle_booking_id}`,
      data,
    );
  },

  assignVehicleBooking: async (
    vehicle_booking_id: string | number,
    data: VehicleBookingAssignmentData,
  ) => {
    return await AxiosInstance.put<VehicleBookingResponse>(
      `/vehicle-bookings/assign/${vehicle_booking_id}`,
      data,
    );
  },

  loadTrashVehicleBookings: async () => {
    return await AxiosInstance.get<VehicleBookingListResponse>(
      "/vehicle-bookings/trash",
    );
  },

  restoreVehicleBooking: async (vehicle_booking_id: string | number) => {
    return await AxiosInstance.put<VehicleBookingResponse>(
      `/vehicle-bookings/restoreVehicleBooking/${vehicle_booking_id}`,
    );
  },

  forceDeleteVehicleBooking: async (vehicle_booking_id: string | number) => {
    return await AxiosInstance.delete<VehicleBookingMessageResponse>(
      `/vehicle-bookings/forceDeleteVehicleBooking/${vehicle_booking_id}`,
    );
  },
};

export default VehicleBookingService;
