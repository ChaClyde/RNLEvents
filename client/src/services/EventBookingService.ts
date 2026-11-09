import AxiosInstance from "./AxiosInstance";

import type {
  EventBookingFilters,
  EventBookingFormData,
  EventBookingListResponse,
  EventBookingMessageResponse,
  EventBookingResponse,
  EventBookingStatusData,
} from "../interfaces/EventBookingColumns";

const EventBookingService = {
  // Load all non-deleted event bookings
  loadEventBookings: async (filters?: EventBookingFilters) => {
    return await AxiosInstance.get<EventBookingListResponse>(
      "/event-bookings",
      { params: filters },
    );
  },

  // Get a single event booking with its venue and office
  getEventBooking: async (event_booking_id: string | number) => {
    return await AxiosInstance.get<EventBookingResponse>(
      `/event-bookings/${event_booking_id}`,
    );
  },

  // Create an event booking
  storeEventBooking: async (data: EventBookingFormData) => {
    return await AxiosInstance.post<EventBookingResponse>(
      "/event-bookings/storeEventBooking",
      data,
    );
  },

  // Update a pending event booking
  updateEventBooking: async (
    event_booking_id: string | number,
    data: EventBookingFormData,
  ) => {
    return await AxiosInstance.put<EventBookingResponse>(
      `/event-bookings/updateEventBooking/${event_booking_id}`,
      data,
    );
  },

  // Move event booking to centralized Trash Bin
  destroyEventBooking: async (event_booking_id: string | number) => {
    return await AxiosInstance.delete<EventBookingMessageResponse>(
      `/event-bookings/destroyEventBooking/${event_booking_id}`,
    );
  },

  // Approve, reject, or cancel an event booking
  updateEventBookingStatus: async (
    event_booking_id: string | number,
    data: EventBookingStatusData,
  ) => {
    return await AxiosInstance.put<EventBookingResponse>(
      `/event-bookings/updateStatus/${event_booking_id}`,
      data,
    );
  },

  // Load event bookings in the Trash Bin
  loadTrashEventBookings: async () => {
    return await AxiosInstance.get<EventBookingListResponse>(
      "/event-bookings/trash",
    );
  },

  // Restore an event booking from the Trash Bin
  restoreEventBooking: async (event_booking_id: string | number) => {
    return await AxiosInstance.put<EventBookingResponse>(
      `/event-bookings/restoreEventBooking/${event_booking_id}`,
    );
  },

  // Permanently delete an event booking
  forceDeleteEventBooking: async (event_booking_id: string | number) => {
    return await AxiosInstance.delete<EventBookingMessageResponse>(
      `/event-bookings/forceDeleteEventBooking/${event_booking_id}`,
    );
  },
};

export default EventBookingService;
