import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { isAxiosError } from "axios";
import AuthService, { type LoginPayload } from "../services/AuthService";
import { setUnauthorizedHandler } from "../services/AxiosInstance";
import type { PermissionUser } from "../permissions";
import { RoleSlug } from "../permissions";

export const ROLE_LABELS: Record<RoleSlug, string> = {
  [RoleSlug.SUPER_ADMIN]: "Super Admin",
  [RoleSlug.EVENT_ADMIN]: "Event Admin",
  [RoleSlug.VEHICLE_ADMIN]: "Vehicle Admin",
  [RoleSlug.EVENT_APPROVAL_ADMIN]: "Event Approval Admin",
  [RoleSlug.VEHICLE_APPROVAL_ADMIN]: "Vehicle Approval Admin",
  [RoleSlug.DEAN_OFFICE_HEAD]: "Dean / Office Head",
  [RoleSlug.FACULTY_STAFF]: "Faculty/Staff",
  [RoleSlug.STUDENT_REPUBLIC]: "Student Republic",
};

export interface SessionUser extends PermissionUser {
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  full_name?: string;
  profile_photo_url?: string | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthResponse {
  user: SessionUser;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

const toSessionUser = (payload: AuthResponse): SessionUser => {
  const user = payload.user;

  return {
    ...user,
    optional_permissions: user.optional_permissions ?? [],
    is_deleted: user.is_deleted ?? false,
    account_status: user.account_status ?? "Active",
  };
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    await AuthService.csrf();
    const response = await AuthService.login(payload);
    setUser(toSessionUser(response.data));
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 401) {
        throw error;
      }
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const response = await AuthService.me();
        if (!cancelled) {
          setUser(toSessionUser(response.data));
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [isLoading, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
