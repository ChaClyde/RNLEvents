<?php

namespace App\Permissions;

use App\Models\Role;

final class PermissionCatalog
{
    /**
     * @return array<string, array<string, AbilityRule>>
     */
    public static function map(): array
    {
        static $map = null;

        return $map ??= [
            Role::SUPER_ADMIN => self::superAdmin(),
            Role::EVENT_ADMIN => self::eventAdmin(),
            Role::VEHICLE_ADMIN => self::vehicleAdmin(),
            Role::EVENT_APPROVAL_ADMIN => self::eventApprovalAdmin(),
            Role::VEHICLE_APPROVAL_ADMIN => self::vehicleApprovalAdmin(),
            Role::DEAN_OFFICE_HEAD => self::deanOfficeHead(),
            Role::FACULTY_STAFF => self::facultyStaff(),
            Role::STUDENT_REPUBLIC => self::studentRepublic(),
        ];
    }

    public static function ruleFor(?string $roleSlug, string $ability): ?AbilityRule
    {
        if ($roleSlug === null) {
            return null;
        }

        return self::map()[$roleSlug][$ability] ?? null;
    }

    /**
     * @return array<string, AbilityRule>
     */
    public static function rulesFor(?string $roleSlug): array
    {
        if ($roleSlug === null) {
            return [];
        }

        return self::map()[$roleSlug] ?? [];
    }

    /**
     * Sidebar groups for Phase 2. A group is visible when the user has
     * any of the listed abilities.
     *
     * @return array<string, list<string>>
     */
    public static function sidebarGroups(): array
    {
        return [
            'dashboard' => [Permission::DASHBOARD_VIEW],
            'user_management' => [
                Permission::USERS_VIEW,
                Permission::ROLES_VIEW,
                Permission::OFFICES_VIEW,
            ],
            'event_management' => [
                Permission::VENUES_VIEW,
                Permission::EVENTS_VIEW,
            ],
            'vehicle_management' => [
                Permission::VEHICLES_VIEW,
                Permission::DRIVERS_VIEW,
            ],
            'booking_management' => [
                Permission::EVENT_BOOKINGS_VIEW,
                Permission::EVENT_BOOKINGS_CREATE,
                Permission::VEHICLE_BOOKINGS_VIEW,
                Permission::VEHICLE_BOOKINGS_CREATE,
            ],
            'approval_management' => [
                Permission::EVENT_APPROVALS_VIEW,
                Permission::VEHICLE_APPROVALS_VIEW,
            ],
            'reports' => [Permission::REPORTS_VIEW],
            'system_history' => [Permission::SYSTEM_HISTORY_VIEW],
            'audit_logs' => [Permission::AUDIT_LOGS_VIEW],
            'messenger' => [Permission::MESSENGER_VIEW],
            'settings' => [Permission::SETTINGS_VIEW],
            'trash' => [Permission::TRASH_VIEW],
        ];
    }

    /**
     * @return array<string, AbilityRule>
     */
    private static function superAdmin(): array
    {
        return array_merge(
            self::crud(Permission::MODULE_USERS),
            self::crud(Permission::MODULE_ROLES),
            self::crud(Permission::MODULE_OFFICES),
            self::crud(Permission::MODULE_VENUES),
            self::crud(Permission::MODULE_EVENTS),
            self::crud(Permission::MODULE_VEHICLES),
            self::crud(Permission::MODULE_DRIVERS),
            [
                Permission::DASHBOARD_VIEW => AbilityRule::global(),
                Permission::EVENT_BOOKINGS_VIEW => AbilityRule::global(),
                Permission::EVENT_BOOKINGS_EDIT => AbilityRule::global(),
                Permission::EVENT_BOOKINGS_DELETE => AbilityRule::global(),
                Permission::EVENT_BOOKINGS_CREATE => AbilityRule::global([
                    'requires_emergency_bypass' => true,
                ]),
                Permission::VEHICLE_BOOKINGS_VIEW => AbilityRule::global(),
                Permission::VEHICLE_BOOKINGS_EDIT => AbilityRule::global(),
                Permission::VEHICLE_BOOKINGS_DELETE => AbilityRule::global(),
                Permission::VEHICLE_BOOKINGS_CREATE => AbilityRule::global([
                    'requires_emergency_bypass' => true,
                ]),
                Permission::EVENT_APPROVALS_VIEW => AbilityRule::global(),
                Permission::EVENT_APPROVALS_APPROVE => AbilityRule::global([
                    'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
                    'approval_stages' => [ApprovalStage::SUPER_ADMIN],
                ]),
                Permission::VEHICLE_APPROVALS_VIEW => AbilityRule::global(),
                Permission::VEHICLE_APPROVALS_APPROVE => AbilityRule::global([
                    'approval_pipeline' => ApprovalStage::PIPELINE_VEHICLE,
                    'approval_stages' => [ApprovalStage::SUPER_ADMIN],
                ]),
                Permission::MESSENGER_VIEW => AbilityRule::global(),
                Permission::REPORTS_VIEW => AbilityRule::global(),
                Permission::REPORTS_VIEW_ALL => AbilityRule::global(),
                Permission::REPORTS_VIEW_EVENT => AbilityRule::global(),
                Permission::REPORTS_VIEW_VEHICLE => AbilityRule::global(),
                Permission::REPORTS_VIEW_OFFICE => AbilityRule::global(),
                Permission::SYSTEM_HISTORY_VIEW => AbilityRule::global(),
                Permission::AUDIT_LOGS_VIEW => AbilityRule::global(),
                Permission::SETTINGS_VIEW => AbilityRule::global(),
                Permission::SETTINGS_EDIT => AbilityRule::global(),
                Permission::TRASH_VIEW => AbilityRule::global(),
                Permission::TRASH_RESTORE => AbilityRule::global(),
                Permission::TRASH_FORCE_DELETE => AbilityRule::global(),
                Permission::EMERGENCY_BYPASS => AbilityRule::global(),
            ],
        );
    }

    /**
     * @return array<string, AbilityRule>
     */
    private static function eventAdmin(): array
    {
        return array_merge(
            self::crud(Permission::MODULE_VENUES),
            self::crud(Permission::MODULE_EVENTS),
            [
                Permission::DASHBOARD_VIEW => AbilityRule::global(),
                Permission::EVENT_BOOKINGS_VIEW => AbilityRule::global(),
                Permission::EVENT_APPROVALS_VIEW => AbilityRule::global(),
                Permission::EVENT_APPROVALS_APPROVE => AbilityRule::global([
                    'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
                    'approval_stages' => [ApprovalStage::EVENT_ADMIN],
                ]),
                Permission::MESSENGER_VIEW => AbilityRule::global(),
                Permission::REPORTS_VIEW => AbilityRule::global(),
                Permission::REPORTS_VIEW_EVENT => AbilityRule::global(),
            ],
        );
    }

    /**
     * @return array<string, AbilityRule>
     */
    private static function vehicleAdmin(): array
    {
        return array_merge(
            self::crud(Permission::MODULE_VEHICLES),
            self::crud(Permission::MODULE_DRIVERS),
            [
                Permission::DASHBOARD_VIEW => AbilityRule::global(),
                Permission::VEHICLE_BOOKINGS_VIEW => AbilityRule::global(),
                Permission::VEHICLE_APPROVALS_VIEW => AbilityRule::global(),
                Permission::VEHICLE_APPROVALS_APPROVE => AbilityRule::global([
                    'approval_pipeline' => ApprovalStage::PIPELINE_VEHICLE,
                    'approval_stages' => [ApprovalStage::VEHICLE_ADMIN],
                ]),
                Permission::MESSENGER_VIEW => AbilityRule::global(),
                Permission::REPORTS_VIEW => AbilityRule::global(),
                Permission::REPORTS_VIEW_VEHICLE => AbilityRule::global(),
            ],
        );
    }

    /**
     * @return array<string, AbilityRule>
     */
    private static function eventApprovalAdmin(): array
    {
        return [
            Permission::DASHBOARD_VIEW => AbilityRule::global(),
            Permission::EVENT_BOOKINGS_VIEW => AbilityRule::global(),
            Permission::EVENT_APPROVALS_VIEW => AbilityRule::global(),
            Permission::EVENT_APPROVALS_APPROVE => AbilityRule::global([
                'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
                'approval_stages' => [ApprovalStage::EVENT_APPROVAL],
            ]),
            Permission::MESSENGER_VIEW => AbilityRule::global(),
            Permission::REPORTS_VIEW => AbilityRule::global(['limited' => true]),
            Permission::REPORTS_VIEW_EVENT => AbilityRule::global(['limited' => true]),
        ];
    }

    /**
     * @return array<string, AbilityRule>
     */
    private static function vehicleApprovalAdmin(): array
    {
        return [
            Permission::DASHBOARD_VIEW => AbilityRule::global(),
            Permission::VEHICLE_BOOKINGS_VIEW => AbilityRule::global(),
            Permission::VEHICLE_APPROVALS_VIEW => AbilityRule::global(),
            Permission::VEHICLE_APPROVALS_APPROVE => AbilityRule::global([
                'approval_pipeline' => ApprovalStage::PIPELINE_VEHICLE,
                'approval_stages' => [ApprovalStage::VEHICLE_APPROVAL],
            ]),
            Permission::MESSENGER_VIEW => AbilityRule::global(),
            Permission::REPORTS_VIEW => AbilityRule::global(['limited' => true]),
            Permission::REPORTS_VIEW_VEHICLE => AbilityRule::global(['limited' => true]),
        ];
    }

    /**
     * @return array<string, AbilityRule>
     */
    private static function deanOfficeHead(): array
    {
        return array_merge(
            self::crud(Permission::MODULE_USERS, AbilityRule::SCOPE_OFFICE),
            [
                Permission::DASHBOARD_VIEW => AbilityRule::global(),
                Permission::EVENT_BOOKINGS_VIEW => AbilityRule::office(['optional' => true]),
                Permission::EVENT_BOOKINGS_CREATE => AbilityRule::office(['optional' => true]),
                Permission::EVENT_BOOKINGS_EDIT => AbilityRule::office(['optional' => true]),
                Permission::EVENT_BOOKINGS_DELETE => AbilityRule::office(['optional' => true]),
                Permission::VEHICLE_BOOKINGS_VIEW => AbilityRule::office(['optional' => true]),
                Permission::VEHICLE_BOOKINGS_CREATE => AbilityRule::office(['optional' => true]),
                Permission::VEHICLE_BOOKINGS_EDIT => AbilityRule::office(['optional' => true]),
                Permission::VEHICLE_BOOKINGS_DELETE => AbilityRule::office(['optional' => true]),
                Permission::EVENT_APPROVALS_VIEW => AbilityRule::office(),
                Permission::EVENT_APPROVALS_APPROVE => AbilityRule::office([
                    'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
                    'approval_stages' => [ApprovalStage::OFFICE_HEAD],
                ]),
                Permission::VEHICLE_APPROVALS_VIEW => AbilityRule::office(),
                Permission::VEHICLE_APPROVALS_APPROVE => AbilityRule::office([
                    'approval_pipeline' => ApprovalStage::PIPELINE_VEHICLE,
                    'approval_stages' => [ApprovalStage::OFFICE_HEAD],
                ]),
                Permission::MESSENGER_VIEW => AbilityRule::global(),
                Permission::REPORTS_VIEW => AbilityRule::office(),
                Permission::REPORTS_VIEW_OFFICE => AbilityRule::office(),
            ],
        );
    }

    /**
     * @return array<string, AbilityRule>
     */
    private static function facultyStaff(): array
    {
        return [
            Permission::DASHBOARD_VIEW => AbilityRule::global(),
            Permission::EVENT_BOOKINGS_VIEW => AbilityRule::own(),
            Permission::EVENT_BOOKINGS_CREATE => AbilityRule::global(),
            Permission::EVENT_BOOKINGS_EDIT => AbilityRule::own(),
            Permission::EVENT_BOOKINGS_DELETE => AbilityRule::own(),
            Permission::VEHICLE_BOOKINGS_VIEW => AbilityRule::own(),
            Permission::VEHICLE_BOOKINGS_CREATE => AbilityRule::global(),
            Permission::VEHICLE_BOOKINGS_EDIT => AbilityRule::own(),
            Permission::VEHICLE_BOOKINGS_DELETE => AbilityRule::own(),
            Permission::EVENT_APPROVALS_VIEW => AbilityRule::own(),
            Permission::VEHICLE_APPROVALS_VIEW => AbilityRule::own(),
            Permission::MESSENGER_VIEW => AbilityRule::global(),
        ];
    }

    /**
     * @return array<string, AbilityRule>
     */
    private static function studentRepublic(): array
    {
        return [
            Permission::DASHBOARD_VIEW => AbilityRule::global(),
            Permission::EVENT_BOOKINGS_VIEW => AbilityRule::own(),
            Permission::EVENT_BOOKINGS_CREATE => AbilityRule::global(),
            Permission::EVENT_BOOKINGS_EDIT => AbilityRule::own(),
            Permission::EVENT_BOOKINGS_DELETE => AbilityRule::own(),
            Permission::EVENT_APPROVALS_VIEW => AbilityRule::own(),
            Permission::MESSENGER_VIEW => AbilityRule::global(),
        ];
    }

    /**
     * @return array<string, AbilityRule>
     */
    private static function crud(string $module, string $scope = AbilityRule::SCOPE_GLOBAL): array
    {
        $rule = AbilityRule::make($scope);

        return [
            $module . '.' . Permission::ACTION_VIEW => $rule,
            $module . '.' . Permission::ACTION_CREATE => $rule,
            $module . '.' . Permission::ACTION_EDIT => $rule,
            $module . '.' . Permission::ACTION_DELETE => $rule,
        ];
    }
}
