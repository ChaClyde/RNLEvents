import { Outlet, useLocation } from "react-router-dom";
import AccessDeniedPage from "../pages/AccessDenied/AccessDeniedPage";
import NotFoundPage from "../pages/NotFound/NotFoundPage";
import { matchRouteAccess } from "../permissions";
import { usePermissions } from "../hooks/usePermissions";

const RequirePermission = () => {
  const location = useLocation();
  const { canAny } = usePermissions();
  const access = matchRouteAccess(location.pathname);

  if (access.kind === "public") {
    return <Outlet />;
  }

  if (access.kind === "unknown") {
    return <NotFoundPage />;
  }

  if (access.abilities.length === 0 || !canAny(access.abilities)) {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
};

export default RequirePermission;
