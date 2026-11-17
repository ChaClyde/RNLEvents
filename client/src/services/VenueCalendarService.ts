import AxiosInstance from "./AxiosInstance";

import type {
  VenueCalendarDayResponse,
  VenueCalendarMonthResponse,
} from "../interfaces/EventBookingColumns";

const VenueCalendarService = {
  // One month of a venue's schedule. month = "YYYY-MM"
  loadMonth: async (
    venueId: number,
    month: string,
    excludeBookingId?: number,
  ) => {
    return await AxiosInstance.get<VenueCalendarMonthResponse>(
      `/availability/venues/${venueId}/calendar`,
      { params: { month, exclude_event_booking_id: excludeBookingId } },
    );
  },

  // Event details and free times for one clicked date
  loadDay: async (venueId: number, date: string, excludeBookingId?: number) => {
    return await AxiosInstance.get<VenueCalendarDayResponse>(
      `/availability/venues/${venueId}/day`,
      { params: { date, exclude_event_booking_id: excludeBookingId } },
    );
  },
};

export default VenueCalendarService;
