export const RoleSlug = {
  SUPER_ADMIN: "super-admin",
  EVENT_ADMIN: "event-admin",
  VEHICLE_ADMIN: "vehicle-admin",
  EVENT_APPROVAL_ADMIN: "event-approval-admin",
  VEHICLE_APPROVAL_ADMIN: "vehicle-approval-admin",
  DEAN_OFFICE_HEAD: "dean-office-head",
  FACULTY_STAFF: "faculty-staff",
  STUDENT_REPUBLIC: "student-republic",
} as const;

export type RoleSlug = (typeof RoleSlug)[keyof typeof RoleSlug];

export const PermissionScope = {
  GLOBAL: "global",
  OFFICE: "office",
  OWN: "own",
} as const;

export type PermissionScope =
  (typeof PermissionScope)[keyof typeof PermissionScope];

export const ApprovalStage = {
  OFFICE_HEAD: "office_head",
  EVENT_APPROVAL: "event_approval",
  EVENT_ADMIN: "event_admin",
  VEHICLE_APPROVAL: "vehicle_approval",
  VEHICLE_ADMIN: "vehicle_admin",
  SUPER_ADMIN: "super_admin",
} as const;

export const ApprovalPipeline = {
  EVENT: "event",
  VEHICLE: "vehicle",
} as const;

export const Permission = {
  DASHBOARD_VIEW: "dashboard.view",

  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",

  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_EDIT: "roles.edit",
  ROLES_DELETE: "roles.delete",

  OFFICES_VIEW: "offices.view",
  OFFICES_CREATE: "offices.create",
  OFFICES_EDIT: "offices.edit",
  OFFICES_DELETE: "offices.delete",

  VENUES_VIEW: "venues.view",
  VENUES_CREATE: "venues.create",
  VENUES_EDIT: "venues.edit",
  VENUES_DELETE: "venues.delete",

  EVENTS_VIEW: "events.view",
  EVENTS_CREATE: "events.create",
  EVENTS_EDIT: "events.edit",
  EVENTS_DELETE: "events.delete",

  VEHICLES_VIEW: "vehicles.view",
  VEHICLES_CREATE: "vehicles.create",
  VEHICLES_EDIT: "vehicles.edit",
  VEHICLES_DELETE: "vehicles.delete",

  DRIVERS_VIEW: "drivers.view",
  DRIVERS_CREATE: "drivers.create",
  DRIVERS_EDIT: "drivers.edit",
  DRIVERS_DELETE: "drivers.delete",

  EVENT_BOOKINGS_VIEW: "event_bookings.view",
  EVENT_BOOKINGS_CREATE: "event_bookings.create",
  EVENT_BOOKINGS_EDIT: "event_bookings.edit",
  EVENT_BOOKINGS_DELETE: "event_bookings.delete",

  VEHICLE_BOOKINGS_VIEW: "vehicle_bookings.view",
  VEHICLE_BOOKINGS_CREATE: "vehicle_bookings.create",
  VEHICLE_BOOKINGS_EDIT: "vehicle_bookings.edit",
  VEHICLE_BOOKINGS_DELETE: "vehicle_bookings.delete",

  EVENT_APPROVALS_VIEW: "event_approvals.view",
  EVENT_APPROVALS_APPROVE: "event_approvals.approve",

  VEHICLE_APPROVALS_VIEW: "vehicle_approvals.view",
  VEHICLE_APPROVALS_APPROVE: "vehicle_approvals.approve",

  MESSENGER_VIEW: "messenger.view",

  REPORTS_VIEW: "reports.view",
  REPORTS_VIEW_ALL: "reports.view_all",
  REPORTS_VIEW_EVENT: "reports.view_event",
  REPORTS_VIEW_VEHICLE: "reports.view_vehicle",
  REPORTS_VIEW_OFFICE: "reports.view_office",

  SYSTEM_HISTORY_VIEW: "system_history.view",
  AUDIT_LOGS_VIEW: "audit_logs.view",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",

  TRASH_VIEW: "trash.view",
  TRASH_RESTORE: "trash.restore",
  TRASH_FORCE_DELETE: "trash.force_delete",

  EMERGENCY_BYPASS: "emergency.bypass",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
