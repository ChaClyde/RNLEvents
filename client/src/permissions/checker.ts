import { permissionCatalog, ruleFor, sidebarGroups } from "./catalog";
import { Permission, PermissionScope, type RoleSlug } from "./constants";

export interface PermissionUser {
  user_id: number;
  office_id: number | null;
  account_status?: string;
  is_deleted?: boolean;
  optional_permissions?: string[] | null;
  role?: {
    slug: string;
    status?: string;
    is_deleted?: boolean;
  } | null;
}

export interface PermissionContext {
  officeId?: number | null;
  ownerId?: number | null;
  approvalStage?: string | null;
  approvalPipeline?: string | null;
  emergencyBypass?: boolean;
}

const knownAbilities = new Set(Object.values(Permission));

export const allows = (
  user: PermissionUser | null | undefined,
  ability: string,
  context: PermissionContext = {},
): boolean => {
  if (!user || !knownAbilities.has(ability as Permission)) {
    return false;
  }

  if (!userCanUsePermissions(user)) {
    return false;
  }

  const slug = user.role?.slug;
  const rule = ruleFor(slug, ability);

  if (context.emergencyBypass && hasEmergencyBypass(user)) {
    return allowsWithEmergencyBypass(user, ability, rule);
  }

  if (!rule) {
    return false;
  }

  if (rule.requiresEmergencyBypass) {
    return false;
  }

  if (rule.optional && !hasOptionalGrant(user, ability)) {
    return false;
  }

  if (!passesScope(user, rule.scope, context)) {
    return false;
  }

  return passesApprovalStage(rule, context);
};

export const grantedAbilities = (user: PermissionUser | null): string[] => {
  if (!user || !userCanUsePermissions(user) || !user.role?.slug) {
    return [];
  }

  const rules = permissionCatalog[user.role.slug as RoleSlug] ?? {};
  const granted: string[] = [];

  for (const [ability, rule] of Object.entries(rules)) {
    if (rule.requiresEmergencyBypass) {
      continue;
    }

    if (rule.optional && !hasOptionalGrant(user, ability)) {
      continue;
    }

    granted.push(ability);
  }

  return granted;
};

export const visibleSidebarGroups = (user: PermissionUser | null): string[] => {
  const abilities = grantedAbilities(user);
  const visible: string[] = [];

  for (const [group, required] of Object.entries(sidebarGroups)) {
    if (required.some((ability) => abilities.includes(ability))) {
      visible.push(group);
    }
  }

  return visible;
};

export const allowsAny = (
  user: PermissionUser | null | undefined,
  abilities: string[],
  context: PermissionContext = {},
): boolean => abilities.some((ability) => allows(user, ability, context));

export const hasEmergencyBypass = (user: PermissionUser | null): boolean => {
  if (!user || !userCanUsePermissions(user)) {
    return false;
  }

  return Boolean(ruleFor(user.role?.slug, Permission.EMERGENCY_BYPASS));
};

const userCanUsePermissions = (user: PermissionUser): boolean => {
  if (user.is_deleted) {
    return false;
  }

  if ((user.account_status ?? "Active") !== "Active") {
    return false;
  }

  const role = user.role;

  if (!role || role.is_deleted || (role.status && role.status !== "active")) {
    return false;
  }

  return true;
};

const hasOptionalGrant = (user: PermissionUser, ability: string): boolean =>
  (user.optional_permissions ?? []).includes(ability);

const allowsWithEmergencyBypass = (
  _user: PermissionUser,
  ability: string,
  rule: ReturnType<typeof ruleFor>,
): boolean => {
  if (ability === Permission.EMERGENCY_BYPASS) {
    return true;
  }

  return Boolean(rule);
};

const passesScope = (
  user: PermissionUser,
  scope: PermissionScope,
  context: PermissionContext,
): boolean => {
  if (scope === PermissionScope.GLOBAL) {
    return true;
  }

  if (scope === PermissionScope.OFFICE) {
    return (
      context.officeId == null ||
      Number(user.office_id) === Number(context.officeId)
    );
  }

  if (scope === PermissionScope.OWN) {
    return (
      context.ownerId == null ||
      Number(user.user_id) === Number(context.ownerId)
    );
  }

  return false;
};

const passesApprovalStage = (
  rule: NonNullable<ReturnType<typeof ruleFor>>,
  context: PermissionContext,
): boolean => {
  if (
    context.approvalPipeline &&
    rule.approvalPipeline &&
    context.approvalPipeline !== rule.approvalPipeline
  ) {
    return false;
  }

  if (!context.approvalStage || !rule.approvalStages?.length) {
    return true;
  }

  return rule.approvalStages.includes(context.approvalStage);
};
