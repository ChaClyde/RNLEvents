import AxiosInstance from "./AxiosInstance";
import type { DashboardChart } from "./DashboardService";

export interface EventReportFilters {
  start_date?: string;
  end_date?: string;
  status?: string;
  office_id?: number | "";
  venue_id?: number | "";
  search?: string;
  list?: "upcoming" | "past" | "";
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: "asc" | "desc";
}

export interface EventReportCard {
  key: string;
  label: string;
  value: number;
}

export interface EventReportOfficeRow {
  office_id: number | null;
  office_name: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export interface EventReportBookingRow {
  event_booking_id: number;
  purpose: string;
  requested_by: string;
  office: string | null;
  venue: string | null;
  date_start: string | null;
  date_end: string | null;
  status: string;
  approval_stage: string;
}

export interface EventReportSummary {
  cards: EventReportCard[];
  limited: boolean;
  options: {
    can_filter_offices: boolean;
    can_filter_venues: boolean;
    locked_office_id: number | null;
    offices: { office_id: number; office_code: string; office_name: string }[];
    venues: { venue_id: number; venue: string }[];
  };
}

export interface EventReportVenues {
  most_frequent: { label: string; value: number }[];
  least_utilized: { label: string; value: number }[];
  frequency: DashboardChart;
  distribution: DashboardChart;
}

export interface EventReportTrends {
  daily: DashboardChart;
  weekly: DashboardChart;
  monthly: DashboardChart;
  yearly: DashboardChart;
}

const paramsOf = (filters: EventReportFilters) => {
  const params: Record<string, string | number> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) {
      params[key] = value;
    }
  });

  return params;
};

const EventReportService = {
  summary: (filters: EventReportFilters) =>
    AxiosInstance.get<{ message: string; data: EventReportSummary }>(
      "/reports/events/summary",
      { params: paramsOf(filters) },
    ),
  trends: (filters: EventReportFilters) =>
    AxiosInstance.get<{ message: string; data: EventReportTrends }>(
      "/reports/events/trends",
      { params: paramsOf(filters) },
    ),
  venues: (filters: EventReportFilters) =>
    AxiosInstance.get<{ message: string; data: EventReportVenues }>(
      "/reports/events/venues",
      { params: paramsOf(filters) },
    ),
  offices: (filters: EventReportFilters) =>
    AxiosInstance.get<{ message: string; data: EventReportOfficeRow[] }>(
      "/reports/events/offices",
      { params: paramsOf(filters) },
    ),
  bookings: (filters: EventReportFilters) =>
    AxiosInstance.get<{
      message: string;
      data: EventReportBookingRow[];
      meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      };
    }>("/reports/events/bookings", { params: paramsOf(filters) }),
  exportPdf: (filters: EventReportFilters) =>
    AxiosInstance.get<Blob>("/reports/events/export/pdf", {
      params: paramsOf(filters),
      responseType: "blob",
    }),
  exportExcel: (filters: EventReportFilters) =>
    AxiosInstance.get<Blob>("/reports/events/export/excel", {
      params: paramsOf(filters),
      responseType: "blob",
    }),
};

export default EventReportService;
