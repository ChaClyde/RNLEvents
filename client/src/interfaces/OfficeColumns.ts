export interface OfficeColumns {
  office_id: number;
  office: string;
  description: string;
  users_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficeFieldErrors {
  office?: string[];
  description?: string[];
}
