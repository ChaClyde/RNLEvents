import AxiosInstance from "./AxiosInstance";
import type { ScheduleConflict } from "../interfaces/EventBookingHelpers";

export interface AvailabilityResponse {
  available: boolean;
  conflicts: ScheduleConflict[];
  message: string;
  unavailability_reason?: string | null;
  vehicle_status?: string;
  driver_status?: string | null;
  capacity?: number;
}

const AvailabilityService = {
  checkVenue: async (params: {
    venue_id: number;
    date_start: string;
    date_end: string;
    time_start: string;
    time_end: string;
    exclude_event_booking_id?: number;
  }) => {
    return await AxiosInstance.get<AvailabilityResponse>("/availability/venues", {
      params,
    });
  },

  checkVehicle: async (params: {
    vehicle_id: number;
    travel_date: string;
    expected_return_date: string;
    departure_time: string;
    expected_return_time: string;
    passenger_count?: number;
    exclude_vehicle_booking_id?: number;
  }) => {
    return await AxiosInstance.get<AvailabilityResponse>(
      "/availability/vehicles",
      { params },
    );
  },

  checkDriver: async (params: {
    driver_id: number;
    travel_date: string;
    expected_return_date: string;
    departure_time: string;
    expected_return_time: string;
    exclude_vehicle_booking_id?: number;
  }) => {
    return await AxiosInstance.get<AvailabilityResponse>(
      "/availability/drivers",
      { params },
    );
  },
};

export default AvailabilityService;
