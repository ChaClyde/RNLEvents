<?php

namespace App\Permissions;

final class Permission
{
    public const MODULE_DASHBOARD = 'dashboard';
    public const MODULE_USERS = 'users';
    public const MODULE_ROLES = 'roles';
    public const MODULE_OFFICES = 'offices';
    public const MODULE_VENUES = 'venues';
    public const MODULE_EVENTS = 'events';
    public const MODULE_VEHICLES = 'vehicles';
    public const MODULE_DRIVERS = 'drivers';
    public const MODULE_EVENT_BOOKINGS = 'event_bookings';
    public const MODULE_VEHICLE_BOOKINGS = 'vehicle_bookings';
    public const MODULE_EVENT_APPROVALS = 'event_approvals';
    public const MODULE_VEHICLE_APPROVALS = 'vehicle_approvals';
    public const MODULE_MESSENGER = 'messenger';
    public const MODULE_REPORTS = 'reports';
    public const MODULE_SYSTEM_HISTORY = 'system_history';
    public const MODULE_AUDIT_LOGS = 'audit_logs';
    public const MODULE_SETTINGS = 'settings';
    public const MODULE_TRASH = 'trash';
    public const MODULE_EMERGENCY = 'emergency';

    public const ACTION_VIEW = 'view';
    public const ACTION_CREATE = 'create';
    public const ACTION_EDIT = 'edit';
    public const ACTION_DELETE = 'delete';
    public const ACTION_APPROVE = 'approve';
    public const ACTION_RESTORE = 'restore';
    public const ACTION_FORCE_DELETE = 'force_delete';
    public const ACTION_BYPASS = 'bypass';
    public const ACTION_VIEW_ALL = 'view_all';
    public const ACTION_VIEW_EVENT = 'view_event';
    public const ACTION_VIEW_VEHICLE = 'view_vehicle';
    public const ACTION_VIEW_OFFICE = 'view_office';

    public const DASHBOARD_VIEW = 'dashboard.view';

    public const USERS_VIEW = 'users.view';
    public const USERS_CREATE = 'users.create';
    public const USERS_EDIT = 'users.edit';
    public const USERS_DELETE = 'users.delete';

    public const ROLES_VIEW = 'roles.view';
    public const ROLES_CREATE = 'roles.create';
    public const ROLES_EDIT = 'roles.edit';
    public const ROLES_DELETE = 'roles.delete';

    public const OFFICES_VIEW = 'offices.view';
    public const OFFICES_CREATE = 'offices.create';
    public const OFFICES_EDIT = 'offices.edit';
    public const OFFICES_DELETE = 'offices.delete';

    public const VENUES_VIEW = 'venues.view';
    public const VENUES_CREATE = 'venues.create';
    public const VENUES_EDIT = 'venues.edit';
    public const VENUES_DELETE = 'venues.delete';

    public const EVENTS_VIEW = 'events.view';
    public const EVENTS_CREATE = 'events.create';
    public const EVENTS_EDIT = 'events.edit';
    public const EVENTS_DELETE = 'events.delete';

    public const VEHICLES_VIEW = 'vehicles.view';
    public const VEHICLES_CREATE = 'vehicles.create';
    public const VEHICLES_EDIT = 'vehicles.edit';
    public const VEHICLES_DELETE = 'vehicles.delete';

    public const DRIVERS_VIEW = 'drivers.view';
    public const DRIVERS_CREATE = 'drivers.create';
    public const DRIVERS_EDIT = 'drivers.edit';
    public const DRIVERS_DELETE = 'drivers.delete';

    public const EVENT_BOOKINGS_VIEW = 'event_bookings.view';
    public const EVENT_BOOKINGS_CREATE = 'event_bookings.create';
    public const EVENT_BOOKINGS_EDIT = 'event_bookings.edit';
    public const EVENT_BOOKINGS_DELETE = 'event_bookings.delete';

    public const VEHICLE_BOOKINGS_VIEW = 'vehicle_bookings.view';
    public const VEHICLE_BOOKINGS_CREATE = 'vehicle_bookings.create';
    public const VEHICLE_BOOKINGS_EDIT = 'vehicle_bookings.edit';
    public const VEHICLE_BOOKINGS_DELETE = 'vehicle_bookings.delete';

    public const EVENT_APPROVALS_VIEW = 'event_approvals.view';
    public const EVENT_APPROVALS_APPROVE = 'event_approvals.approve';

    public const VEHICLE_APPROVALS_VIEW = 'vehicle_approvals.view';
    public const VEHICLE_APPROVALS_APPROVE = 'vehicle_approvals.approve';

    public const MESSENGER_VIEW = 'messenger.view';

    public const REPORTS_VIEW = 'reports.view';
    public const REPORTS_VIEW_ALL = 'reports.view_all';
    public const REPORTS_VIEW_EVENT = 'reports.view_event';
    public const REPORTS_VIEW_VEHICLE = 'reports.view_vehicle';
    public const REPORTS_VIEW_OFFICE = 'reports.view_office';

    public const SYSTEM_HISTORY_VIEW = 'system_history.view';
    public const AUDIT_LOGS_VIEW = 'audit_logs.view';

    public const SETTINGS_VIEW = 'settings.view';
    public const SETTINGS_EDIT = 'settings.edit';

    public const TRASH_VIEW = 'trash.view';
    public const TRASH_RESTORE = 'trash.restore';
    public const TRASH_FORCE_DELETE = 'trash.force_delete';

    public const EMERGENCY_BYPASS = 'emergency.bypass';

    public static function all(): array
    {
        return [
            self::DASHBOARD_VIEW,
            self::USERS_VIEW,
            self::USERS_CREATE,
            self::USERS_EDIT,
            self::USERS_DELETE,
            self::ROLES_VIEW,
            self::ROLES_CREATE,
            self::ROLES_EDIT,
            self::ROLES_DELETE,
            self::OFFICES_VIEW,
            self::OFFICES_CREATE,
            self::OFFICES_EDIT,
            self::OFFICES_DELETE,
            self::VENUES_VIEW,
            self::VENUES_CREATE,
            self::VENUES_EDIT,
            self::VENUES_DELETE,
            self::EVENTS_VIEW,
            self::EVENTS_CREATE,
            self::EVENTS_EDIT,
            self::EVENTS_DELETE,
            self::VEHICLES_VIEW,
            self::VEHICLES_CREATE,
            self::VEHICLES_EDIT,
            self::VEHICLES_DELETE,
            self::DRIVERS_VIEW,
            self::DRIVERS_CREATE,
            self::DRIVERS_EDIT,
            self::DRIVERS_DELETE,
            self::EVENT_BOOKINGS_VIEW,
            self::EVENT_BOOKINGS_CREATE,
            self::EVENT_BOOKINGS_EDIT,
            self::EVENT_BOOKINGS_DELETE,
            self::VEHICLE_BOOKINGS_VIEW,
            self::VEHICLE_BOOKINGS_CREATE,
            self::VEHICLE_BOOKINGS_EDIT,
            self::VEHICLE_BOOKINGS_DELETE,
            self::EVENT_APPROVALS_VIEW,
            self::EVENT_APPROVALS_APPROVE,
            self::VEHICLE_APPROVALS_VIEW,
            self::VEHICLE_APPROVALS_APPROVE,
            self::MESSENGER_VIEW,
            self::REPORTS_VIEW,
            self::REPORTS_VIEW_ALL,
            self::REPORTS_VIEW_EVENT,
            self::REPORTS_VIEW_VEHICLE,
            self::REPORTS_VIEW_OFFICE,
            self::SYSTEM_HISTORY_VIEW,
            self::AUDIT_LOGS_VIEW,
            self::SETTINGS_VIEW,
            self::SETTINGS_EDIT,
            self::TRASH_VIEW,
            self::TRASH_RESTORE,
            self::TRASH_FORCE_DELETE,
            self::EMERGENCY_BYPASS,
        ];
    }

    public static function knows(string $ability): bool
    {
        return in_array($ability, self::all(), true);
    }

    public static function moduleOf(string $ability): string
    {
        return explode('.', $ability, 2)[0] ?? $ability;
    }

    public static function actionOf(string $ability): string
    {
        return explode('.', $ability, 2)[1] ?? '';
    }
}
