import { allows, allowsAny, hasEmergencyBypass } from "./checker";
import { Permission } from "./constants";
import type { PermissionUser } from "./checker";

export interface SidebarNavChild {
  id: string;
  text: string;
  path: string;
  abilities: string[];
}

export interface SidebarNavItem {
  id: string;
  text: string;
  path?: string;
  abilities: string[];
  badge?: number;
  children?: SidebarNavChild[];
}

const canSeeBookingModule = (user: PermissionUser): boolean =>
  allows(user, Permission.EVENT_BOOKINGS_CREATE) ||
  allows(user, Permission.VEHICLE_BOOKINGS_CREATE) ||
  hasEmergencyBypass(user);

export const sidebarNavigation: SidebarNavItem[] = [
  {
    id: "dashboard",
    text: "Dashboard",
    path: "/",
    abilities: [Permission.DASHBOARD_VIEW],
  },
  {
    id: "calendar",
    text: "Schedule Calendar",
    path: "/calendar",
    abilities: [
      Permission.EVENT_BOOKINGS_VIEW,
      Permission.VEHICLE_BOOKINGS_VIEW,
      Permission.EVENTS_VIEW,
      Permission.EVENT_APPROVALS_VIEW,
      Permission.VEHICLE_APPROVALS_VIEW,
    ],
  },
  {
    id: "user_management",
    text: "User Management",
    abilities: [
      Permission.USERS_VIEW,
      Permission.ROLES_VIEW,
      Permission.OFFICES_VIEW,
    ],
    children: [
      {
        id: "roles",
        text: "Roles List",
        path: "/roles",
        abilities: [Permission.ROLES_VIEW],
      },
      {
        id: "offices",
        text: "Office List",
        path: "/offices",
        abilities: [Permission.OFFICES_VIEW],
      },
      {
        id: "users",
        text: "User List",
        path: "/users",
        abilities: [Permission.USERS_VIEW],
      },
    ],
  },
  {
    id: "event_management",
    text: "Event Management",
    abilities: [Permission.VENUES_VIEW, Permission.EVENTS_VIEW],
    children: [
      {
        id: "venues",
        text: "Venue List",
        path: "/venues",
        abilities: [Permission.VENUES_VIEW],
      },
      {
        id: "events",
        text: "Event List",
        path: "/events",
        abilities: [Permission.EVENTS_VIEW],
      },
    ],
  },
  {
    id: "vehicle_management",
    text: "Vehicle Management",
    abilities: [Permission.VEHICLES_VIEW, Permission.DRIVERS_VIEW],
    children: [
      {
        id: "vehicles",
        text: "Vehicle List",
        path: "/vehicles",
        abilities: [Permission.VEHICLES_VIEW],
      },
      {
        id: "drivers",
        text: "Driver List",
        path: "/drivers",
        abilities: [Permission.DRIVERS_VIEW],
      },
      {
        id: "vehicle-list",
        text: "Vehicle List",
        path: "/vehicle-list",
        abilities: [Permission.VEHICLES_VIEW],
      },
    ],
  },
  {
    id: "booking_management",
    text: "Booking Management",
    abilities: [
      Permission.EVENT_BOOKINGS_CREATE,
      Permission.VEHICLE_BOOKINGS_CREATE,
      Permission.EMERGENCY_BYPASS,
    ],
    children: [
      {
        id: "event-bookings",
        text: "Event Booking List",
        path: "/event-bookings",
        abilities: [
          Permission.EVENT_BOOKINGS_VIEW,
          Permission.EVENT_BOOKINGS_CREATE,
        ],
      },
      {
        id: "vehicle-bookings",
        text: "Vehicle Booking List",
        path: "/vehicle-bookings",
        abilities: [
          Permission.VEHICLE_BOOKINGS_VIEW,
          Permission.VEHICLE_BOOKINGS_CREATE,
        ],
      },
    ],
  },
  {
    id: "approval_management",
    text: "Approval Management",
    abilities: [
      Permission.EVENT_APPROVALS_VIEW,
      Permission.VEHICLE_APPROVALS_VIEW,
    ],
    children: [
      {
        id: "event-approvals",
        text: "Venue Approvals",
        path: "/approvals/venues",
        abilities: [Permission.EVENT_APPROVALS_VIEW],
      },
      {
        id: "vehicle-approvals",
        text: "Vehicle Approvals",
        path: "/approvals/vehicles",
        abilities: [Permission.VEHICLE_APPROVALS_VIEW],
      },
    ],
  },
  {
    id: "reports",
    text: "Reports & Analytics",
    path: "/reports",
    abilities: [Permission.REPORTS_VIEW],
  },
  {
    id: "system_history",
    text: "System History",
    path: "/system-history",
    abilities: [Permission.SYSTEM_HISTORY_VIEW],
  },
  {
    id: "audit_logs",
    text: "Audit Logs",
    path: "/audit-logs",
    abilities: [Permission.AUDIT_LOGS_VIEW],
  },
  {
    id: "messenger",
    text: "Messenger",
    path: "/messenger",
    abilities: [Permission.MESSENGER_VIEW],
  },
  {
    id: "announcements",
    text: "Announcements",
    path: "/announcements",
    abilities: [Permission.DASHBOARD_VIEW],
  },
  {
    id: "settings",
    text: "System Settings",
    path: "/settings",
    abilities: [Permission.SETTINGS_VIEW],
  },
  {
    id: "trash",
    text: "Trash Bin",
    path: "/trash-bin",
    abilities: [Permission.TRASH_VIEW],
  },
];

const childLabel = (user: PermissionUser, child: SidebarNavChild): string => {
  if (child.id === "users" && !allows(user, Permission.ROLES_VIEW)) {
    return "Office Users";
  }

  if (
    child.id === "event-approvals" &&
    !allows(user, Permission.EVENT_APPROVALS_APPROVE)
  ) {
    return "My Event Requests";
  }

  if (
    child.id === "vehicle-approvals" &&
    !allows(user, Permission.VEHICLE_APPROVALS_APPROVE)
  ) {
    return "My Vehicle Requests";
  }

  return child.text;
};

export const getVisibleSidebarItems = (
  user: PermissionUser | null,
  pendingApprovals = 0,
): SidebarNavItem[] => {
  if (!user) {
    return [];
  }

  return sidebarNavigation.flatMap((item) => {
    if (item.id === "booking_management" && !canSeeBookingModule(user)) {
      return [];
    }

    if (!allowsAny(user, item.abilities)) {
      return [];
    }

    const children = item.children
      ?.filter((child) => allowsAny(user, child.abilities))
      .map((child) => ({
        ...child,
        text: childLabel(user, child),
      }));

    if (item.children && (!children || children.length === 0)) {
      return [];
    }

    return [
      {
        ...item,
        children,
        badge: item.id === "approval_management" ? pendingApprovals : item.badge,
      },
    ];
  });
};
