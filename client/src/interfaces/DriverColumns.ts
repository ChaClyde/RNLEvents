export interface DriverColumns {
  driver_id: number;
  driver_name: string;
  driver_status: "Available" | "On Leave" | "Sick Leave" | "Unavailable";
  status_remarks: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverFieldErrors {
  driver_name?: string[];
  driver_status?: string[];
  status_remarks?: string[];
}
