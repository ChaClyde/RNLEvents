<?php

namespace Tests\Unit\Rbac;

use App\Models\Role;
use App\Permissions\AbilityRule;
use App\Permissions\ApprovalStage;
use App\Permissions\Permission;
use App\Permissions\PermissionCatalog;
use App\Permissions\PermissionContext;
use PHPUnit\Framework\TestCase;

class PermissionCatalogIntegrityTest extends TestCase
{
    public function test_every_system_role_has_a_catalog_entry(): void
    {
        $this->assertEqualsCanonicalizing(
            Role::SYSTEM_SLUGS,
            array_keys(PermissionCatalog::map())
        );
    }

    public function test_catalog_abilities_are_known_and_unique(): void
    {
        $this->assertSame(
            Permission::all(),
            array_values(array_unique(Permission::all()))
        );

        foreach (PermissionCatalog::map() as $roleSlug => $rules) {
            foreach ($rules as $ability => $rule) {
                $this->assertTrue(
                    Permission::knows($ability),
                    "{$roleSlug} has unknown ability {$ability}"
                );
                $this->assertInstanceOf(AbilityRule::class, $rule);
            }
        }
    }

    public function test_emergency_bypass_is_only_on_super_admin(): void
    {
        foreach (PermissionCatalog::map() as $roleSlug => $rules) {
            $hasBypass = array_key_exists(Permission::EMERGENCY_BYPASS, $rules);

            $this->assertSame(
                $roleSlug === Role::SUPER_ADMIN,
                $hasBypass,
                "{$roleSlug} emergency bypass flag is incorrect"
            );
        }
    }

    public function test_only_super_admin_booking_create_requires_emergency_bypass(): void
    {
        foreach (PermissionCatalog::map() as $roleSlug => $rules) {
            foreach ($rules as $ability => $rule) {
                if ($rule->requiresEmergencyBypass) {
                    $this->assertSame(Role::SUPER_ADMIN, $roleSlug);
                    $this->assertContains($ability, [
                        Permission::EVENT_BOOKINGS_CREATE,
                        Permission::VEHICLE_BOOKINGS_CREATE,
                    ]);
                }
            }
        }
    }

    public function test_optional_permissions_are_only_dean_booking_abilities(): void
    {
        $optional = [];

        foreach (PermissionCatalog::map() as $roleSlug => $rules) {
            foreach ($rules as $ability => $rule) {
                if ($rule->optional) {
                    $optional[] = [$roleSlug, $ability];
                }
            }
        }

        $this->assertSame([
            [Role::DEAN_OFFICE_HEAD, Permission::EVENT_BOOKINGS_VIEW],
            [Role::DEAN_OFFICE_HEAD, Permission::EVENT_BOOKINGS_CREATE],
            [Role::DEAN_OFFICE_HEAD, Permission::EVENT_BOOKINGS_EDIT],
            [Role::DEAN_OFFICE_HEAD, Permission::EVENT_BOOKINGS_DELETE],
            [Role::DEAN_OFFICE_HEAD, Permission::VEHICLE_BOOKINGS_VIEW],
            [Role::DEAN_OFFICE_HEAD, Permission::VEHICLE_BOOKINGS_CREATE],
            [Role::DEAN_OFFICE_HEAD, Permission::VEHICLE_BOOKINGS_EDIT],
            [Role::DEAN_OFFICE_HEAD, Permission::VEHICLE_BOOKINGS_DELETE],
        ], $optional);
    }

    public function test_approval_stages_match_each_role(): void
    {
        $this->assertSame(
            [ApprovalStage::SUPER_ADMIN],
            PermissionCatalog::ruleFor(Role::SUPER_ADMIN, Permission::EVENT_APPROVALS_APPROVE)?->approvalStages
        );
        $this->assertSame(
            [ApprovalStage::EVENT_ADMIN],
            PermissionCatalog::ruleFor(Role::EVENT_ADMIN, Permission::EVENT_APPROVALS_APPROVE)?->approvalStages
        );
        $this->assertSame(
            [ApprovalStage::EVENT_APPROVAL],
            PermissionCatalog::ruleFor(Role::EVENT_APPROVAL_ADMIN, Permission::EVENT_APPROVALS_APPROVE)?->approvalStages
        );
        $this->assertSame(
            [ApprovalStage::OFFICE_HEAD],
            PermissionCatalog::ruleFor(Role::DEAN_OFFICE_HEAD, Permission::EVENT_APPROVALS_APPROVE)?->approvalStages
        );
        $this->assertSame(
            [ApprovalStage::VEHICLE_ADMIN],
            PermissionCatalog::ruleFor(Role::VEHICLE_ADMIN, Permission::VEHICLE_APPROVALS_APPROVE)?->approvalStages
        );
        $this->assertSame(
            [ApprovalStage::VEHICLE_APPROVAL],
            PermissionCatalog::ruleFor(Role::VEHICLE_APPROVAL_ADMIN, Permission::VEHICLE_APPROVALS_APPROVE)?->approvalStages
        );
        $this->assertSame(
            [ApprovalStage::OFFICE_HEAD],
            PermissionCatalog::ruleFor(Role::DEAN_OFFICE_HEAD, Permission::VEHICLE_APPROVALS_APPROVE)?->approvalStages
        );

        $this->assertNull(
            PermissionCatalog::ruleFor(Role::FACULTY_STAFF, Permission::EVENT_APPROVALS_APPROVE)
        );
        $this->assertNull(
            PermissionCatalog::ruleFor(Role::STUDENT_REPUBLIC, Permission::EVENT_APPROVALS_APPROVE)
        );
    }

    public function test_permission_context_reads_office_owner_and_stage_from_a_resource(): void
    {
        $resource = (object) [
            'office_id' => '12',
            'requested_by_user_id' => '44',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
        ];

        $context = PermissionContext::from($resource);

        $this->assertSame(12, $context->officeId);
        $this->assertSame(44, $context->ownerId);
        $this->assertSame(ApprovalStage::OFFICE_HEAD, $context->approvalStage);
        $this->assertFalse($context->emergencyBypass);
    }

    public function test_unknown_abilities_are_rejected_by_the_catalog(): void
    {
        $this->assertFalse(Permission::knows('not.a.permission'));
        $this->assertNull(PermissionCatalog::ruleFor(Role::SUPER_ADMIN, 'not.a.permission'));
    }
}
