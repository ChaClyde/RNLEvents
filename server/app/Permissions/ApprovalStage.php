<?php

namespace App\Permissions;

final class ApprovalStage
{
    public const OFFICE_HEAD = 'office_head';
    public const EVENT_APPROVAL = 'event_approval';
    public const EVENT_ADMIN = 'event_admin';
    public const VEHICLE_APPROVAL = 'vehicle_approval';
    public const VEHICLE_ADMIN = 'vehicle_admin';
    public const OIC_BUDGET = 'oic_budget';
    public const SUPER_ADMIN = 'super_admin';

    public const PIPELINE_EVENT = 'event';
    public const PIPELINE_VEHICLE = 'vehicle';

    /** Office Head -> Event Admin -> Event Approval Admin -> Super Admin */
    public static function eventPipeline(): array
    {
        return [
            self::OFFICE_HEAD,
            self::EVENT_ADMIN,
            self::EVENT_APPROVAL,
            self::SUPER_ADMIN,
        ];
    }

    public static function vehiclePipeline(): array
    {
        return [
            self::OFFICE_HEAD,
            self::VEHICLE_ADMIN,
            self::VEHICLE_APPROVAL,
            self::OIC_BUDGET,
            self::SUPER_ADMIN,
        ];
    }

    public static function firstEventStage(): string
    {
        return self::eventPipeline()[0];
    }

    public static function isEventStage(string $stage): bool
    {
        return in_array($stage, self::eventPipeline(), true);
    }

    public static function nextEventStage(string $stage): ?string
    {
        $pipeline = self::eventPipeline();
        $index = array_search($stage, $pipeline, true);

        return $index === false ? null : ($pipeline[$index + 1] ?? null);
    }

    public static function isFinalEventStage(string $stage): bool
    {
        return $stage === self::SUPER_ADMIN;
    }

    public static function isVehicleStage(string $stage): bool
    {
        return in_array($stage, self::vehiclePipeline(), true);
    }

    public static function nextVehicleStage(string $stage): ?string
    {
        $pipeline = self::vehiclePipeline();
        $index = array_search($stage, $pipeline, true);

        return $index === false ? null : ($pipeline[$index + 1] ?? null);
    }

    public static function isFinalVehicleStage(string $stage): bool
    {
        return $stage === self::SUPER_ADMIN;
    }

    public static function isVehicleAssignmentStage(string $stage): bool
    {
        return in_array($stage, [self::VEHICLE_ADMIN, self::SUPER_ADMIN], true);
    }
}