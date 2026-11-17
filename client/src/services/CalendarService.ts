import AxiosInstance from "./AxiosInstance";

export interface CalendarItem {
  id: string;
  type: "event" | "event_booking" | "vehicle_booking" | "driver";
  title: string;
  status: string;
  start: string;
  end: string;
  venue_id?: number | null;
  vehicle_id?: number | null;
  driver_id?: number | null;
  resource_label?: string | null;
  office?: string | null;
  requested_by?: string | null;
  destination?: string | null;
  unavailability_reason?: string | null;
}

export interface CalendarVenueOption {
  venue_id: number;
  venue: string;
}

export interface CalendarVehicleOption {
  vehicle_id: number;
  vehicle_name: string;
  plate_number?: string | null;
}

export interface CalendarDriverOption {
  driver_id: number;
  driver_name: string;
}

export interface CalendarOptionsResponse {
  message: string;
  venues: CalendarVenueOption[];
  vehicles: CalendarVehicleOption[];
  drivers: CalendarDriverOption[];
}

export interface CalendarResponse {
  message: string;
  data: CalendarItem[];
}

const CalendarService = {
  load: async (params: { from: string; to: string; type?: string }) => {
    return await AxiosInstance.get<CalendarResponse>("/calendar", { params });
  },

  options: async () => {
    return await AxiosInstance.get<CalendarOptionsResponse>("/calendar/options");
  },
};

export default CalendarService;
