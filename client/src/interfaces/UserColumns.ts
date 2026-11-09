import type { OfficeColumns } from "./OfficeColumns";
import type { RoleColumns } from "./RoleColumns";

export type UserAccountStatus = "Active" | "Inactive";

export interface UserColumns {
  user_id: number;

  // Profile
  profile_photo: string | null;
  profile_photo_url: string | null;

  // Personal Information
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix_name: string | null;
  full_name: string;

  // Account Credentials
  email: string;
  email_verified_at: string | null;
  username: string;

  // Additional Information
  position: string | null;
  contact_number: string | null;

  // Role and Office
  role_id: number;
  role: RoleColumns | null;

  office_id: number;
  office: OfficeColumns | null;

  optional_permissions?: string[] | null;

  // Account Status
  account_status: UserAccountStatus;
  must_change_password: boolean;

  // Activity
  online_status: boolean;
  last_login_at: string | null;
  last_activity_at: string | null;

  // Soft Delete
  is_deleted: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UserFieldErrors {
  profile_photo?: string[];

  first_name?: string[];
  middle_name?: string[];
  last_name?: string[];
  suffix_name?: string[];

  email?: string[];
  username?: string[];

  position?: string[];
  contact_number?: string[];

  role_id?: string[];
  office_id?: string[];

  password?: string[];
  password_confirmation?: string[];

  account_status?: string[];
}

export interface UserPayload {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix_name?: string | null;

  email: string;
  username: string;

  position?: string | null;
  contact_number?: string | null;

  role_id: number;
  office_id: number;

  account_status: UserAccountStatus;

  password?: string;
  password_confirmation?: string;
}
