import AxiosInstance from "./AxiosInstance";

import type { AxiosProgressEvent } from "axios";
import type {
  AvailabilityCheckResponse,
  EventBookingAttachment,
  EventBookingFilters,
  EventBookingFeeSnapshot,
  EventBookingFormData,
  EventBookingListResponse,
  EventBookingMessageResponse,
  EventBookingResponse,
  EventBookingScheduleInput,
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

  // Get a single event booking with its venue, office and schedule
  getEventBooking: async (event_booking_id: string | number) => {
    return await AxiosInstance.get<EventBookingResponse>(
      `/event-bookings/${event_booking_id}`,
    );
  },

  // Dry run: conflicts + suggestions, saves nothing
  previewFee: async (
    data: EventBookingScheduleInput & {
      venue_id: number;
      resources?: Array<{ resource_id?: number | null; quantity?: number }>;
    },
  ) => {
    return await AxiosInstance.post<{ data: EventBookingFeeSnapshot }>(
      "/event-bookings/previewFee",
      data,
    );
  },

  checkAvailability: async (
    data: EventBookingScheduleInput & {
      venue_id: number;
      exclude_event_booking_id?: number;
      university_wide_activity?: boolean;
      reservation_span?: "standard" | "whole_semester" | "whole_summer";
    },
  ) => {
    return await AxiosInstance.post<AvailabilityCheckResponse>(
      "/event-bookings/check-availability",
      data,
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

  uploadAttachment: async (
    event_booking_id: string | number,
    file: File,
    onProgress?: (percent: number) => void,
  ) => {
    const body = new FormData();
    body.append("file", file);
    body.append("attachment_type", "letter_of_request");

    return await AxiosInstance.post<{
      message: string;
      data: EventBookingAttachment;
    }>(`/event-bookings/${event_booking_id}/attachments`, body, {
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
  },

  deleteAttachment: async (
    event_booking_id: string | number,
    attachment_id: string | number,
  ) => {
    return await AxiosInstance.delete<EventBookingMessageResponse>(
      `/event-bookings/${event_booking_id}/attachments/${attachment_id}`,
    );
  },

  previewAttachment: async (
    event_booking_id: string | number,
    attachment_id: string | number,
  ) => {
    return await AxiosInstance.get<Blob>(
      `/event-bookings/${event_booking_id}/attachments/${attachment_id}/preview`,
      { responseType: "blob" },
    );
  },

  downloadAttachment: async (
    event_booking_id: string | number,
    attachment_id: string | number,
  ) => {
    return await AxiosInstance.get<Blob>(
      `/event-bookings/${event_booking_id}/attachments/${attachment_id}/download`,
      { responseType: "blob" },
    );
  },

  facilityRates: async () => {
    return await AxiosInstance.get<{
      data: {
        title: string;
        effective: string;
        evening_note: string;
        items: Array<{
          name: string;
          rate: string;
          unit: string;
          details: string | null;
          note: string | null;
        }>;
        prepared_by: string;
        endorsed_by: string;
        approved_by: string;
      };
    }>("/event-bookings/facility-rates");
  },

  updateFeeCalculation: async (
    event_booking_id: string | number,
    payload: {
      confirm: boolean;
      lines: Array<{
        event_booking_fee_line_id: number;
        quantity: number;
        unit_amount: number;
      }>;
    },
  ) => {
    return await AxiosInstance.put<EventBookingResponse>(
      `/event-bookings/${event_booking_id}/fee-calculation`,
      payload,
    );
  },

  requesterSignature: async (event_booking_id: string | number) => {
    return await AxiosInstance.get<Blob>(
      `/event-bookings/${event_booking_id}/requester-signature`,
      { responseType: "blob" },
    );
  },

  previewBookingSlip: async (event_booking_id: string | number) => {
    return await AxiosInstance.get<Blob>(
      `/event-bookings/${event_booking_id}/booking-slip/preview`,
      { responseType: "blob" },
    );
  },

  downloadBookingSlip: async (event_booking_id: string | number) => {
    return await AxiosInstance.get<Blob>(
      `/event-bookings/${event_booking_id}/booking-slip/download`,
      { responseType: "blob" },
    );
  },
};

export default EventBookingService;
