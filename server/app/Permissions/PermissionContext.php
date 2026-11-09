<?php

namespace App\Permissions;

final class PermissionContext
{
    public function __construct(
        public mixed $resource = null,
        public ?int $officeId = null,
        public ?int $ownerId = null,
        public ?string $approvalStage = null,
        public ?string $approvalPipeline = null,
        public bool $emergencyBypass = false,
    ) {}

    public static function from(mixed $value = null): self
    {
        if ($value instanceof self) {
            return $value;
        }

        if ($value === null) {
            return new self();
        }

        if (is_array($value)) {
            $resource = $value['resource'] ?? null;

            return new self(
                resource: $resource,
                officeId: self::nullableInt($value['office_id'] ?? $value['officeId'] ?? null)
                    ?? self::officeIdFrom($resource),
                ownerId: self::nullableInt($value['owner_id'] ?? $value['ownerId'] ?? null)
                    ?? self::ownerIdFrom($resource),
                approvalStage: $value['approval_stage'] ?? $value['approvalStage'] ?? self::stageFrom($resource),
                approvalPipeline: $value['approval_pipeline'] ?? $value['approvalPipeline'] ?? null,
                emergencyBypass: (bool) ($value['emergency_bypass'] ?? $value['emergencyBypass'] ?? false),
            );
        }

        if (is_object($value)) {
            return new self(
                resource: $value,
                officeId: self::officeIdFrom($value),
                ownerId: self::ownerIdFrom($value),
                approvalStage: self::stageFrom($value),
            );
        }

        return new self();
    }

    public function withEmergencyBypass(bool $enabled = true): self
    {
        $clone = clone $this;
        $clone->emergencyBypass = $enabled;

        return $clone;
    }

    private static function officeIdFrom(mixed $resource): ?int
    {
        if (!is_object($resource)) {
            return null;
        }

        return self::nullableInt($resource->office_id ?? null);
    }

    private static function ownerIdFrom(mixed $resource): ?int
    {
        if (!is_object($resource)) {
            return null;
        }

        return self::nullableInt(
            $resource->requested_by_user_id
                ?? $resource->user_id
                ?? $resource->created_by
                ?? null
        );
    }

    private static function stageFrom(mixed $resource): ?string
    {
        if (!is_object($resource)) {
            return null;
        }

        $stage = $resource->approval_stage ?? null;

        return is_string($stage) ? $stage : null;
    }

    private static function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }
}
