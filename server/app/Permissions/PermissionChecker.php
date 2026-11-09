<?php

namespace App\Permissions;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class PermissionChecker
{
    public function allows(User $user, string $ability, mixed $context = null): bool
    {
        if (!Permission::knows($ability)) {
            return false;
        }

        $context = PermissionContext::from($context);

        if (!$this->userCanUsePermissions($user)) {
            return false;
        }

        $slug = $this->roleSlug($user);
        $rule = PermissionCatalog::ruleFor($slug, $ability);

        if ($context->emergencyBypass && $this->hasEmergencyBypass($user)) {
            return $this->allowsWithEmergencyBypass($user, $ability, $rule);
        }

        if ($rule === null) {
            return false;
        }

        if ($rule->requiresEmergencyBypass) {
            return false;
        }

        if ($rule->optional && !$this->hasOptionalGrant($user, $ability)) {
            return false;
        }

        if (!$this->passesScope($user, $rule, $context)) {
            return false;
        }

        return $this->passesApprovalStage($rule, $context);
    }

    /**
     * Abilities the role actually has, ignoring resource scope.
     * Optional abilities are included only when granted on the user.
     *
     * @return list<string>
     */
    public function grantedAbilities(User $user): array
    {
        if (!$this->userCanUsePermissions($user)) {
            return [];
        }

        $granted = [];

        foreach (PermissionCatalog::rulesFor($this->roleSlug($user)) as $ability => $rule) {
            if ($rule->requiresEmergencyBypass) {
                continue;
            }

            if ($rule->optional && !$this->hasOptionalGrant($user, $ability)) {
                continue;
            }

            $granted[] = $ability;
        }

        return $granted;
    }

    /**
     * @return list<string>
     */
    public function visibleSidebarGroups(User $user): array
    {
        $abilities = $this->grantedAbilities($user);
        $visible = [];

        foreach (PermissionCatalog::sidebarGroups() as $group => $required) {
            foreach ($required as $ability) {
                if (in_array($ability, $abilities, true)) {
                    $visible[] = $group;
                    break;
                }
            }
        }

        return $visible;
    }

    /**
     * Apply office / ownership filters for list queries (Phase 3).
     */
    public function constrainQuery(
        Builder $query,
        User $user,
        string $ability,
        array $columns = [],
    ): Builder {
        if (!$this->userCanUsePermissions($user) || !Permission::knows($ability)) {
            return $query->whereRaw('1 = 0');
        }

        $rule = PermissionCatalog::ruleFor($this->roleSlug($user), $ability);

        if ($rule === null || $rule->requiresEmergencyBypass) {
            return $query->whereRaw('1 = 0');
        }

        if ($rule->optional && !$this->hasOptionalGrant($user, $ability)) {
            return $query->whereRaw('1 = 0');
        }

        $officeColumn = $columns['office_id'] ?? 'office_id';
        $ownerColumn = $columns['owner_id'] ?? 'requested_by_user_id';

        return match ($rule->scope) {
            AbilityRule::SCOPE_OFFICE => $query->where($officeColumn, $user->office_id),
            AbilityRule::SCOPE_OWN => $query->where($ownerColumn, $user->user_id),
            default => $query,
        };
    }

    public function hasEmergencyBypass(User $user): bool
    {
        if (!$this->userCanUsePermissions($user)) {
            return false;
        }

        return PermissionCatalog::ruleFor(
            $this->roleSlug($user),
            Permission::EMERGENCY_BYPASS
        ) !== null;
    }

    public function isLimited(User $user, string $ability): bool
    {
        if (!$this->allows($user, $ability)) {
            return false;
        }

        return PermissionCatalog::ruleFor($this->roleSlug($user), $ability)?->limited ?? false;
    }

    private function allowsWithEmergencyBypass(User $user, string $ability, ?AbilityRule $rule): bool
    {
        if ($ability === Permission::EMERGENCY_BYPASS) {
            return true;
        }

        if ($rule === null) {
            return false;
        }

        return true;
    }

    private function userCanUsePermissions(User $user): bool
    {
        if ($user->is_deleted) {
            return false;
        }

        if (($user->account_status ?? 'Active') !== 'Active') {
            return false;
        }

        $user->loadMissing('role');

        $role = $user->role;

        if ($role === null || $role->is_deleted || $role->status !== 'active') {
            return false;
        }

        return true;
    }

    private function roleSlug(User $user): ?string
    {
        $user->loadMissing('role');

        return $user->role?->slug;
    }

    private function hasOptionalGrant(User $user, string $ability): bool
    {
        $granted = $user->optional_permissions ?? [];

        if (!is_array($granted)) {
            return false;
        }

        return in_array($ability, $granted, true);
    }

    private function passesScope(User $user, AbilityRule $rule, PermissionContext $context): bool
    {
        return match ($rule->scope) {
            AbilityRule::SCOPE_GLOBAL => true,
            AbilityRule::SCOPE_OFFICE => $this->passesBoundScope(
                $context->officeId,
                $user->office_id,
                $context->resource !== null,
            ),
            AbilityRule::SCOPE_OWN => $this->passesBoundScope(
                $context->ownerId,
                $user->user_id,
                $context->resource !== null,
            ),
            default => false,
        };
    }

    private function passesBoundScope(?int $boundId, mixed $actorId, bool $hasResource): bool
    {
        if ($boundId !== null) {
            return (int) $actorId === (int) $boundId;
        }

        return !$hasResource;
    }

    private function passesApprovalStage(AbilityRule $rule, PermissionContext $context): bool
    {
        if ($context->approvalPipeline !== null && $rule->approvalPipeline !== null) {
            if ($context->approvalPipeline !== $rule->approvalPipeline) {
                return false;
            }
        }

        if ($context->approvalStage === null || $rule->approvalStages === []) {
            return true;
        }

        return in_array($context->approvalStage, $rule->approvalStages, true);
    }
}
