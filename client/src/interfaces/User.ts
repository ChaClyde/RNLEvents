import type { OfficeColumns } from "./OfficeColumns";
import type { RoleColumns } from "./RoleColumns";

export interface User {
  user_id: number;
  profile_photo: string | null;
  profile_photo_url: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix_name: string | null;
  full_name: string;
  email: string;
  username: string;
  role_id: number;
  role: RoleColumns;
  office_id: number;
  office: OfficeColumns;
  account_status: "Active" | "Inactive";
  online_status: "Online" | "Offline";
  last_login_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserFieldErrors {
  profile_photo?: string[];
  first_name?: string[];
  middle_name?: string[];
  last_name?: string[];
  suffix_name?: string[];
  role_id?: string[];
  office_id?: string[];
  email?: string[];
  username?: string[];
  password?: string[];
  password_confirmation?: string[];
  account_status?: string[];
}
