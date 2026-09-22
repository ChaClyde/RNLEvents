export interface RoleColumns {
  role_id: number;
  role: string;
  description: string;
  users_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleFieldErrors {
  role?: string[];
  description?: string[];
}
