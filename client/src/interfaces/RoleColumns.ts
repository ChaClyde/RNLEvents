export type RoleStatus = "active" | "inactive";

export interface RoleColumns {
  role_id: number;
  name: string;
  slug: string;
  description: string | null;
  status: RoleStatus;
  is_system_role: boolean;
  users_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePayload {
  name: string;
  description: string;
  status?: RoleStatus;
}

export interface RoleFieldErrors {
  name?: string[];
  slug?: string[];
  description?: string[];
  status?: string[];
}
