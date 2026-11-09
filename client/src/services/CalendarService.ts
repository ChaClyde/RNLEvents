import AxiosInstance from "./AxiosInstance";

export interface CalendarItem {
  id: string;
  type: "event" | "event_booking" | "vehicle_booking" | "driver";
  title: string;
  status: string;
  start: string;
  end: string;
  resource_label?: string | null;
  office?: string | null;
  requested_by?: string | null;
  destination?: string | null;
  unavailability_reason?: string | null;
}

export interface CalendarResponse {
  message: string;
  data: CalendarItem[];
}

const CalendarService = {
  load: async (params: { from: string; to: string; type?: string }) => {
    return await AxiosInstance.get<CalendarResponse>("/calendar", { params });
  },
};

export default CalendarService;
