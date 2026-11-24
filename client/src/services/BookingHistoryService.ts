import AxiosInstance from "./AxiosInstance";

export interface BookingHistoryFilters {
  module: "events" | "vehicles";
  status?: "approved" | "rejected" | "";
  search?: string;
  page?: number;
  per_page?: number;
}

export interface BookingHistoryRow {
  id: number;
  module: "event" | "vehicle";
  purpose: string;
  requested_by: string;
  office: string | null;
  place: string | null;
  vehicle: string | null;
  driver: string | null;
  date_start: string | null;
  date_end: string | null;
  status: "approved" | "rejected";
  remarks: string | null;
  updated_at: string | null;
}

export interface BookingHistorySummary {
  events_approved: number;
  events_rejected: number;
  vehicles_approved: number;
  vehicles_rejected: number;
}

const BookingHistoryService = {
  index: (filters: BookingHistoryFilters) => {
    const params: Record<string, string | number> = {
      module: filters.module,
    };

    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.search) {
      params.search = filters.search;
    }
    if (filters.page) {
      params.page = filters.page;
    }
    if (filters.per_page) {
      params.per_page = filters.per_page;
    }

    return AxiosInstance.get<{
      message: string;
      data: BookingHistoryRow[];
      summary: BookingHistorySummary;
      meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      };
    }>("/booking-history", { params });
  },
};

export default BookingHistoryService;
