import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Spinner from "../components/Spinner/Spinner";
import { useAuth } from "../contexts/AuthContext";

const AuthLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#1E3A5F]">
    <Spinner size="lg" />
  </div>
);

export const RequireAuth = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export const GuestRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  if (isLoading) {
    return <AuthLoading />;
  }

  if (user) {
    const destination = from && from !== "/login" ? from : "/";
    return <Navigate to={destination} replace />;
  }

  return children;
};
