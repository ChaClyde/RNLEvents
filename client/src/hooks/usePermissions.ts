import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  allows,
  allowsAny,
  grantedAbilities,
  hasEmergencyBypass,
  type PermissionContext,
} from "../permissions";

export const usePermissions = () => {
  const { user } = useAuth();

  return useMemo(
    () => ({
      user: user ?? null,
      can: (ability: string, context?: PermissionContext) =>
        allows(user, ability, context),
      canAny: (abilities: string[], context?: PermissionContext) =>
        allowsAny(user, abilities, context),
      grantedAbilities: grantedAbilities(user),
      hasEmergencyBypass: hasEmergencyBypass(user),
    }),
    [user],
  );
};
