import AxiosInstance from "./AxiosInstance";
import type { DashboardChart } from "./DashboardService";

export interface VehicleReportFilters {
  start_date?: string;
  end_date?: string;
  status?: string;
  office_id?: number | "";
  vehicle_id?: number | "";
  driver_id?: number | "";
  destination?: string;
  search?: string;
  list?: "upcoming" | "past" | "";
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: "asc" | "desc";
}

export interface VehicleReportCard {
  key: string;
  label: string;
  value: number;
}

export interface VehicleReportOfficeRow {
  office_id: number | null;
  office_name: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export interface VehicleReportBookingRow {
  vehicle_booking_id: number;
  requested_by: string;
  office: string | null;
  destination: string;
  purpose: string;
  vehicle: string | null;
  plate_number: string | null;
  driver: string | null;
  travel_date: string | null;
  departure_time: string | null;
  expected_return_date: string | null;
  expected_return_time: string | null;
  passenger_count: number;
  status: string;
  approval_stage: string;
}

export interface VehicleReportSummary {
  cards: VehicleReportCard[];
  limited: boolean;
  options: {
    can_filter_offices: boolean;
    can_filter_vehicles: boolean;
    can_filter_drivers: boolean;
    locked_office_id: number | null;
    offices: { office_id: number; office_code: string; office_name: string }[];
    vehicles: {
      vehicle_id: number;
      vehicle_name: string;
      plate_number: string;
      status: string;
    }[];
    drivers: {
      driver_id: number;
      driver_name: string;
      driver_status: string;
    }[];
  };
}

export interface VehicleReportTrends {
  daily: DashboardChart;
  weekly: DashboardChart;
  monthly: DashboardChart;
  yearly: DashboardChart;
  status_distribution: DashboardChart;
}

export interface VehicleReportUtilization {
  can_view_fleet: boolean;
  fleet: {
    available: number;
    unavailable: number;
    maintenance: number;
    total: number;
  };
  most_frequent: { label: string; value: number }[];
  least_utilized: { label: string; value: number }[];
  trips_per_vehicle: { label: string; value: number }[];
  frequency: DashboardChart;
  distribution: DashboardChart;
}

export interface VehicleReportDrivers {
  can_view_drivers: boolean;
  cards: VehicleReportCard[];
  inventory: {
    total: number;
    available: number;
    on_leave: number;
    unavailable: number;
  };
  assignments: { label: string; value: number }[];
  utilization: DashboardChart;
  leave: {
    driver_id: number;
    driver_name: string;
    status: string;
    status_remarks: string | null;
    status_start_date: string | null;
    status_end_date: string | null;
  }[];
  licenses: {
    driver_id: number;
    driver_name: string;
    license_expiry: string | null;
    expired: boolean;
  }[];
}

const paramsOf = (filters: VehicleReportFilters) => {
  const params: Record<string, string | number> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) {
      params[key] = value;
    }
  });

  return params;
};

const VehicleReportService = {
  summary: (filters: VehicleReportFilters) =>
    AxiosInstance.get<{ message: string; data: VehicleReportSummary }>(
      "/reports/vehicles/summary",
      { params: paramsOf(filters) },
    ),
  trends: (filters: VehicleReportFilters) =>
    AxiosInstance.get<{ message: string; data: VehicleReportTrends }>(
      "/reports/vehicles/trends",
      { params: paramsOf(filters) },
    ),
  utilization: (filters: VehicleReportFilters) =>
    AxiosInstance.get<{ message: string; data: VehicleReportUtilization }>(
      "/reports/vehicles/utilization",
      { params: paramsOf(filters) },
    ),
  drivers: (filters: VehicleReportFilters) =>
    AxiosInstance.get<{ message: string; data: VehicleReportDrivers }>(
      "/reports/vehicles/drivers",
      { params: paramsOf(filters) },
    ),
  offices: (filters: VehicleReportFilters) =>
    AxiosInstance.get<{ message: string; data: VehicleReportOfficeRow[] }>(
      "/reports/vehicles/offices",
      { params: paramsOf(filters) },
    ),
  bookings: (filters: VehicleReportFilters) =>
    AxiosInstance.get<{
      message: string;
      data: VehicleReportBookingRow[];
      meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      };
    }>("/reports/vehicles/bookings", { params: paramsOf(filters) }),
  exportPdf: (filters: VehicleReportFilters) =>
    AxiosInstance.get<Blob>("/reports/vehicles/export/pdf", {
      params: paramsOf(filters),
      responseType: "blob",
    }),
  exportExcel: (filters: VehicleReportFilters) =>
    AxiosInstance.get<Blob>("/reports/vehicles/export/excel", {
      params: paramsOf(filters),
      responseType: "blob",
    }),
};

export default VehicleReportService;
