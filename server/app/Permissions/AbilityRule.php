<?php

namespace App\Permissions;

final class AbilityRule
{
    public const SCOPE_GLOBAL = 'global';
    public const SCOPE_OFFICE = 'office';
    public const SCOPE_OWN = 'own';

    public function __construct(
        public readonly string $scope = self::SCOPE_GLOBAL,
        public readonly bool $optional = false,
        public readonly bool $requiresEmergencyBypass = false,
        public readonly bool $limited = false,
        public readonly ?string $approvalPipeline = null,
        public readonly array $approvalStages = [],
    ) {}

    public static function global(array $overrides = []): self
    {
        return self::make(self::SCOPE_GLOBAL, $overrides);
    }

    public static function office(array $overrides = []): self
    {
        return self::make(self::SCOPE_OFFICE, $overrides);
    }

    public static function own(array $overrides = []): self
    {
        return self::make(self::SCOPE_OWN, $overrides);
    }

    public static function make(string $scope, array $overrides = []): self
    {
        return new self(
            scope: $scope,
            optional: $overrides['optional'] ?? false,
            requiresEmergencyBypass: $overrides['requires_emergency_bypass'] ?? false,
            limited: $overrides['limited'] ?? false,
            approvalPipeline: $overrides['approval_pipeline'] ?? null,
            approvalStages: $overrides['approval_stages'] ?? [],
        );
    }

    public function toArray(): array
    {
        return [
            'scope' => $this->scope,
            'optional' => $this->optional,
            'requires_emergency_bypass' => $this->requiresEmergencyBypass,
            'limited' => $this->limited,
            'approval_pipeline' => $this->approvalPipeline,
            'approval_stages' => $this->approvalStages,
        ];
    }
}
