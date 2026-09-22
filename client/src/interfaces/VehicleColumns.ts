export interface VehicleColumns {
  vehicle_id: number;
  vehicle_name: string;
  vehicle_maintenance: string | null;
  vehicle_type: string | null;
  capacity: string | null;
  status: string;
  image_path: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleFieldErrors {
  image_path?: string[];
  vehicle_name?: string[];
  vehicle_maintenance?: string[];
  vehicle_type?: string[];
  capacity?: string[];
  status?: string[];
}
