export type OfficeStatus = "active" | "inactive";

export interface OfficeColumns {
  office_id: number;
  office_code: string;
  office_name: string;
  office_type: string | null;
  description: string | null;
  contact_email: string | null;
  contact_number: string | null;
  location: string | null;
  status: OfficeStatus;
  users_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficePayload {
  office_code: string;
  office_name: string;
  office_type?: string | null;
  description?: string | null;
  contact_email?: string | null;
  contact_number?: string | null;
  location?: string | null;
  status: OfficeStatus;
}

export interface OfficeFieldErrors {
  office_code?: string[];
  office_name?: string[];
  office_type?: string[];
  description?: string[];
  contact_email?: string[];
  contact_number?: string[];
  location?: string[];
  status?: string[];
}
