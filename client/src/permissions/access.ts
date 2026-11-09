import { Permission } from "./constants";

export type RouteAccess =
  | { kind: "public" }
  | { kind: "protected"; abilities: string[] }
  | { kind: "unknown" };

interface RouteRule {
  path: string;
  exact?: boolean;
  public?: boolean;
  abilities?: string[];
}

const routeRules: RouteRule[] = [
  { path: "/login", public: true, exact: true },

  { path: "/", abilities: [Permission.DASHBOARD_VIEW], exact: true },
  {
    path: "/calendar",
    abilities: [
      Permission.EVENT_BOOKINGS_VIEW,
      Permission.VEHICLE_BOOKINGS_VIEW,
      Permission.EVENTS_VIEW,
      Permission.EVENT_APPROVALS_VIEW,
      Permission.VEHICLE_APPROVALS_VIEW,
    ],
    exact: true,
  },
  { path: "/profile", abilities: [Permission.DASHBOARD_VIEW], exact: true },

  { path: "/roles", abilities: [Permission.ROLES_VIEW] },
  { path: "/offices", abilities: [Permission.OFFICES_VIEW] },
  { path: "/users", abilities: [Permission.USERS_VIEW] },

  { path: "/venues", abilities: [Permission.VENUES_VIEW] },
  { path: "/events", abilities: [Permission.EVENTS_VIEW] },

  { path: "/vehicles", abilities: [Permission.VEHICLES_VIEW] },
  { path: "/vehicle-list", abilities: [Permission.VEHICLES_VIEW], exact: true },
  { path: "/drivers", abilities: [Permission.DRIVERS_VIEW] },

  {
    path: "/event-bookings",
    abilities: [Permission.EVENT_BOOKINGS_CREATE, Permission.EMERGENCY_BYPASS],
  },
  {
    path: "/vehicle-bookings",
    abilities: [
      Permission.VEHICLE_BOOKINGS_CREATE,
      Permission.EMERGENCY_BYPASS,
    ],
  },

  {
    path: "/approvals/venues",
    abilities: [Permission.EVENT_APPROVALS_VIEW],
  },
  {
    path: "/approvals/vehicles",
    abilities: [Permission.VEHICLE_APPROVALS_VIEW],
  },

  { path: "/reports", abilities: [Permission.REPORTS_VIEW] },
  { path: "/system-history", abilities: [Permission.SYSTEM_HISTORY_VIEW] },
  { path: "/audit-logs", abilities: [Permission.AUDIT_LOGS_VIEW] },
  { path: "/messenger", abilities: [Permission.MESSENGER_VIEW] },
  { path: "/announcements", abilities: [Permission.DASHBOARD_VIEW] },
  { path: "/settings", abilities: [Permission.SETTINGS_VIEW] },
  { path: "/trash-bin", abilities: [Permission.TRASH_VIEW] },
];

export const matchRouteAccess = (pathname: string): RouteAccess => {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  const matches = routeRules.filter((rule) => {
    if (rule.exact) {
      return normalized === rule.path;
    }

    return (
      normalized === rule.path || normalized.startsWith(`${rule.path}/`)
    );
  });

  if (matches.length === 0) {
    return { kind: "unknown" };
  }

  matches.sort((a, b) => b.path.length - a.path.length);
  const rule = matches[0];

  if (rule.public) {
    return { kind: "public" };
  }

  return {
    kind: "protected",
    abilities: rule.abilities ?? [],
  };
};
