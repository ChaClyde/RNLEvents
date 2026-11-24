import AxiosInstance from "./AxiosInstance";
import type { VenueMaintenanceRecord } from "../interfaces/VenueColumns";

export interface VenueMaintenancePayload {
  venue_id: number;
  reason: string;
  notes?: string | null;
  date_start: string;
  date_end: string;
}

const VenueMaintenanceService = {
  loadMaintenance: (venueId: number) =>
    AxiosInstance.get<{ data: VenueMaintenanceRecord[] }>("/venue-maintenance", {
      params: { venue_id: venueId },
    }),

  storeMaintenance: (data: VenueMaintenancePayload) =>
    AxiosInstance.post<{ message: string; data: VenueMaintenanceRecord }>(
      "/venue-maintenance/storeMaintenance",
      data,
    ),

  updateStatus: (
    maintenanceId: number,
    status: VenueMaintenanceRecord["status"],
  ) =>
    AxiosInstance.put<{ message: string }>(
      `/venue-maintenance/updateStatus/${maintenanceId}`,
      { status },
    ),

  destroyMaintenance: (maintenanceId: number) =>
    AxiosInstance.delete<{ message: string }>(
      `/venue-maintenance/destroyMaintenance/${maintenanceId}`,
    ),
};

export default VenueMaintenanceService;
