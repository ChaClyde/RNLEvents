import {
  ApprovalPipeline,
  ApprovalStage,
  Permission,
  PermissionScope,
  RoleSlug,
} from "./constants";

export interface AbilityRule {
  scope: PermissionScope;
  optional?: boolean;
  requiresEmergencyBypass?: boolean;
  limited?: boolean;
  approvalPipeline?: string;
  approvalStages?: string[];
}

const global = (overrides: Partial<AbilityRule> = {}): AbilityRule => ({
  scope: PermissionScope.GLOBAL,
  ...overrides,
});

const office = (overrides: Partial<AbilityRule> = {}): AbilityRule => ({
  scope: PermissionScope.OFFICE,
  ...overrides,
});

const own = (overrides: Partial<AbilityRule> = {}): AbilityRule => ({
  scope: PermissionScope.OWN,
  ...overrides,
});

const crud = (
  module: string,
  scope: PermissionScope = PermissionScope.GLOBAL,
): Record<string, AbilityRule> => {
  const rule: AbilityRule = { scope };

  return {
    [`${module}.view`]: rule,
    [`${module}.create`]: rule,
    [`${module}.edit`]: rule,
    [`${module}.delete`]: rule,
  };
};

export const permissionCatalog: Record<
  RoleSlug,
  Record<string, AbilityRule>
> = {
  [RoleSlug.SUPER_ADMIN]: {
    ...crud("users"),
    ...crud("roles"),
    ...crud("offices"),
    ...crud("venues"),
    ...crud("events"),
    ...crud("vehicles"),
    ...crud("drivers"),
    [Permission.DASHBOARD_VIEW]: global(),
    [Permission.EVENT_BOOKINGS_VIEW]: global(),
    [Permission.EVENT_BOOKINGS_EDIT]: global(),
    [Permission.EVENT_BOOKINGS_DELETE]: global(),
    [Permission.EVENT_BOOKINGS_CREATE]: global({
      requiresEmergencyBypass: true,
    }),
    [Permission.VEHICLE_BOOKINGS_VIEW]: global(),
    [Permission.VEHICLE_BOOKINGS_EDIT]: global(),
    [Permission.VEHICLE_BOOKINGS_DELETE]: global(),
    [Permission.VEHICLE_BOOKINGS_CREATE]: global({
      requiresEmergencyBypass: true,
    }),
    [Permission.EVENT_APPROVALS_VIEW]: global(),
    [Permission.EVENT_APPROVALS_APPROVE]: global({
      approvalPipeline: ApprovalPipeline.EVENT,
      approvalStages: [ApprovalStage.SUPER_ADMIN],
    }),
    [Permission.VEHICLE_APPROVALS_VIEW]: global(),
    [Permission.VEHICLE_APPROVALS_APPROVE]: global({
      approvalPipeline: ApprovalPipeline.VEHICLE,
      approvalStages: [ApprovalStage.SUPER_ADMIN],
    }),
    [Permission.MESSENGER_VIEW]: global(),
    [Permission.REPORTS_VIEW]: global(),
    [Permission.REPORTS_VIEW_ALL]: global(),
    [Permission.REPORTS_VIEW_EVENT]: global(),
    [Permission.REPORTS_VIEW_VEHICLE]: global(),
    [Permission.REPORTS_VIEW_OFFICE]: global(),
    [Permission.SYSTEM_HISTORY_VIEW]: global(),
    [Permission.AUDIT_LOGS_VIEW]: global(),
    [Permission.SETTINGS_VIEW]: global(),
    [Permission.SETTINGS_EDIT]: global(),
    [Permission.TRASH_VIEW]: global(),
    [Permission.TRASH_RESTORE]: global(),
    [Permission.TRASH_FORCE_DELETE]: global(),
    [Permission.EMERGENCY_BYPASS]: global(),
  },

  [RoleSlug.EVENT_ADMIN]: {
    ...crud("venues"),
    ...crud("events"),
    [Permission.DASHBOARD_VIEW]: global(),
    [Permission.EVENT_BOOKINGS_VIEW]: global(),
    [Permission.EVENT_APPROVALS_VIEW]: global(),
    [Permission.EVENT_APPROVALS_APPROVE]: global({
      approvalPipeline: ApprovalPipeline.EVENT,
      approvalStages: [ApprovalStage.EVENT_ADMIN],
    }),
    [Permission.MESSENGER_VIEW]: global(),
    [Permission.REPORTS_VIEW]: global(),
    [Permission.REPORTS_VIEW_EVENT]: global(),
  },

  [RoleSlug.VEHICLE_ADMIN]: {
    ...crud("vehicles"),
    ...crud("drivers"),
    [Permission.DASHBOARD_VIEW]: global(),
    [Permission.VEHICLE_BOOKINGS_VIEW]: global(),
    [Permission.VEHICLE_APPROVALS_VIEW]: global(),
    [Permission.VEHICLE_APPROVALS_APPROVE]: global({
      approvalPipeline: ApprovalPipeline.VEHICLE,
      approvalStages: [ApprovalStage.VEHICLE_ADMIN],
    }),
    [Permission.MESSENGER_VIEW]: global(),
    [Permission.REPORTS_VIEW]: global(),
    [Permission.REPORTS_VIEW_VEHICLE]: global(),
  },

  [RoleSlug.EVENT_APPROVAL_ADMIN]: {
    [Permission.DASHBOARD_VIEW]: global(),
    [Permission.EVENT_BOOKINGS_VIEW]: global(),
    [Permission.EVENT_APPROVALS_VIEW]: global(),
    [Permission.EVENT_APPROVALS_APPROVE]: global({
      approvalPipeline: ApprovalPipeline.EVENT,
      approvalStages: [ApprovalStage.EVENT_APPROVAL],
    }),
    [Permission.MESSENGER_VIEW]: global(),
    [Permission.REPORTS_VIEW]: global({ limited: true }),
    [Permission.REPORTS_VIEW_EVENT]: global({ limited: true }),
  },

  [RoleSlug.VEHICLE_APPROVAL_ADMIN]: {
    [Permission.DASHBOARD_VIEW]: global(),
    [Permission.VEHICLE_BOOKINGS_VIEW]: global(),
    [Permission.VEHICLE_APPROVALS_VIEW]: global(),
    [Permission.VEHICLE_APPROVALS_APPROVE]: global({
      approvalPipeline: ApprovalPipeline.VEHICLE,
      approvalStages: [ApprovalStage.VEHICLE_APPROVAL],
    }),
    [Permission.MESSENGER_VIEW]: global(),
    [Permission.REPORTS_VIEW]: global({ limited: true }),
    [Permission.REPORTS_VIEW_VEHICLE]: global({ limited: true }),
  },

  [RoleSlug.DEAN_OFFICE_HEAD]: {
    ...crud("users", PermissionScope.OFFICE),
    [Permission.DASHBOARD_VIEW]: global(),
    [Permission.EVENT_BOOKINGS_VIEW]: office({ optional: true }),
    [Permission.EVENT_BOOKINGS_CREATE]: office({ optional: true }),
    [Permission.EVENT_BOOKINGS_EDIT]: office({ optional: true }),
    [Permission.EVENT_BOOKINGS_DELETE]: office({ optional: true }),
    [Permission.VEHICLE_BOOKINGS_VIEW]: office({ optional: true }),
    [Permission.VEHICLE_BOOKINGS_CREATE]: office({ optional: true }),
    [Permission.VEHICLE_BOOKINGS_EDIT]: office({ optional: true }),
    [Permission.VEHICLE_BOOKINGS_DELETE]: office({ optional: true }),
    [Permission.EVENT_APPROVALS_VIEW]: office(),
    [Permission.EVENT_APPROVALS_APPROVE]: office({
      approvalPipeline: ApprovalPipeline.EVENT,
      approvalStages: [ApprovalStage.OFFICE_HEAD],
    }),
    [Permission.VEHICLE_APPROVALS_VIEW]: office(),
    [Permission.VEHICLE_APPROVALS_APPROVE]: office({
      approvalPipeline: ApprovalPipeline.VEHICLE,
      approvalStages: [ApprovalStage.OFFICE_HEAD],
    }),
    [Permission.MESSENGER_VIEW]: global(),
    [Permission.REPORTS_VIEW]: office(),
    [Permission.REPORTS_VIEW_OFFICE]: office(),
  },

  [RoleSlug.FACULTY_STAFF]: {
    [Permission.DASHBOARD_VIEW]: global(),
    [Permission.EVENT_BOOKINGS_VIEW]: own(),
    [Permission.EVENT_BOOKINGS_CREATE]: global(),
    [Permission.EVENT_BOOKINGS_EDIT]: own(),
    [Permission.EVENT_BOOKINGS_DELETE]: own(),
    [Permission.VEHICLE_BOOKINGS_VIEW]: own(),
    [Permission.VEHICLE_BOOKINGS_CREATE]: global(),
    [Permission.VEHICLE_BOOKINGS_EDIT]: own(),
    [Permission.VEHICLE_BOOKINGS_DELETE]: own(),
    [Permission.EVENT_APPROVALS_VIEW]: own(),
    [Permission.VEHICLE_APPROVALS_VIEW]: own(),
    [Permission.MESSENGER_VIEW]: global(),
  },

  [RoleSlug.STUDENT_REPUBLIC]: {
    [Permission.DASHBOARD_VIEW]: global(),
    [Permission.EVENT_BOOKINGS_VIEW]: own(),
    [Permission.EVENT_BOOKINGS_CREATE]: global(),
    [Permission.EVENT_BOOKINGS_EDIT]: own(),
    [Permission.EVENT_BOOKINGS_DELETE]: own(),
    [Permission.EVENT_APPROVALS_VIEW]: own(),
    [Permission.MESSENGER_VIEW]: global(),
  },
};

export const sidebarGroups: Record<string, string[]> = {
  dashboard: [Permission.DASHBOARD_VIEW],
  user_management: [
    Permission.USERS_VIEW,
    Permission.ROLES_VIEW,
    Permission.OFFICES_VIEW,
  ],
  event_management: [Permission.VENUES_VIEW, Permission.EVENTS_VIEW],
  vehicle_management: [Permission.VEHICLES_VIEW, Permission.DRIVERS_VIEW],
  booking_management: [
    Permission.EVENT_BOOKINGS_VIEW,
    Permission.EVENT_BOOKINGS_CREATE,
    Permission.VEHICLE_BOOKINGS_VIEW,
    Permission.VEHICLE_BOOKINGS_CREATE,
  ],
  approval_management: [
    Permission.EVENT_APPROVALS_VIEW,
    Permission.VEHICLE_APPROVALS_VIEW,
  ],
  reports: [Permission.REPORTS_VIEW],
  system_history: [Permission.SYSTEM_HISTORY_VIEW],
  audit_logs: [Permission.AUDIT_LOGS_VIEW],
  messenger: [Permission.MESSENGER_VIEW],
  settings: [Permission.SETTINGS_VIEW],
  trash: [Permission.TRASH_VIEW],
};

export const ruleFor = (
  roleSlug: string | null | undefined,
  ability: string,
): AbilityRule | undefined => {
  if (!roleSlug || !(roleSlug in permissionCatalog)) {
    return undefined;
  }

  return permissionCatalog[roleSlug as RoleSlug][ability];
};
