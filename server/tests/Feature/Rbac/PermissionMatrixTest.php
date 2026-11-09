<?php

namespace Tests\Feature\Rbac;

use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Permissions\ApprovalStage;
use App\Permissions\Permission;
use App\Permissions\PermissionContext;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PermissionMatrixTest extends TestCase
{
    use RefreshDatabase;

    private Office $officeA;
    private Office $officeB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);

        $this->officeA = Office::create([
            'office_code' => 'OFF-A',
            'office_name' => 'Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->officeB = Office::create([
            'office_code' => 'OFF-B',
            'office_name' => 'Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);
    }

    public function test_role_seeder_is_idempotent_and_creates_eight_system_roles(): void
    {
        $this->seed(RoleSeeder::class);

        $this->assertSame(8, Role::where('is_system_role', true)->count());
        $this->assertEqualsCanonicalizing(
            Role::SYSTEM_SLUGS,
            Role::where('is_system_role', true)->pluck('slug')->all()
        );
    }

    #[DataProvider('moduleAccessProvider')]
    public function test_module_access_matches_the_permission_matrix(
        string $roleSlug,
        string $ability,
        bool $allowed,
    ): void {
        $user = $this->userFor($roleSlug);

        $this->assertSame($allowed, $user->allows($ability));
        $this->assertSame($allowed, $user->can($ability));
    }

    public static function moduleAccessProvider(): array
    {
        $roles = [
            Role::SUPER_ADMIN,
            Role::EVENT_ADMIN,
            Role::VEHICLE_ADMIN,
            Role::EVENT_APPROVAL_ADMIN,
            Role::VEHICLE_APPROVAL_ADMIN,
            Role::DEAN_OFFICE_HEAD,
            Role::FACULTY_STAFF,
            Role::STUDENT_REPUBLIC,
        ];

        $cases = [];

        foreach ($roles as $role) {
            $cases["{$role} dashboard"] = [$role, Permission::DASHBOARD_VIEW, true];
            $cases["{$role} messenger"] = [$role, Permission::MESSENGER_VIEW, true];
        }

        $yes = true;
        $no = false;

        $matrix = [
            Permission::ROLES_VIEW => [$yes, $no, $no, $no, $no, $no, $no, $no],
            Permission::OFFICES_VIEW => [$yes, $no, $no, $no, $no, $no, $no, $no],
            Permission::USERS_VIEW => [$yes, $no, $no, $no, $no, $yes, $no, $no],
            Permission::VENUES_VIEW => [$yes, $yes, $no, $no, $no, $no, $no, $no],
            Permission::EVENTS_VIEW => [$yes, $yes, $no, $no, $no, $no, $no, $no],
            Permission::VEHICLES_VIEW => [$yes, $no, $yes, $no, $no, $no, $no, $no],
            Permission::DRIVERS_VIEW => [$yes, $no, $yes, $no, $no, $no, $no, $no],
            Permission::EVENT_BOOKINGS_CREATE => [$no, $no, $no, $no, $no, $no, $yes, $yes],
            Permission::VEHICLE_BOOKINGS_CREATE => [$no, $no, $no, $no, $no, $no, $yes, $no],
            Permission::EVENT_APPROVALS_APPROVE => [$yes, $yes, $no, $yes, $no, $yes, $no, $no],
            Permission::VEHICLE_APPROVALS_APPROVE => [$yes, $no, $yes, $no, $yes, $yes, $no, $no],
            Permission::EVENT_APPROVALS_VIEW => [$yes, $yes, $no, $yes, $no, $yes, $yes, $yes],
            Permission::VEHICLE_APPROVALS_VIEW => [$yes, $no, $yes, $no, $yes, $yes, $yes, $no],
            Permission::REPORTS_VIEW => [$yes, $yes, $yes, $yes, $yes, $yes, $no, $no],
            Permission::SYSTEM_HISTORY_VIEW => [$yes, $no, $no, $no, $no, $no, $no, $no],
            Permission::AUDIT_LOGS_VIEW => [$yes, $no, $no, $no, $no, $no, $no, $no],
            Permission::SETTINGS_VIEW => [$yes, $no, $no, $no, $no, $no, $no, $no],
            Permission::EMERGENCY_BYPASS => [$yes, $no, $no, $no, $no, $no, $no, $no],
        ];

        foreach ($matrix as $ability => $flags) {
            foreach ($roles as $index => $role) {
                $cases["{$role} {$ability}"] = [$role, $ability, $flags[$index]];
            }
        }

        return $cases;
    }

    public function test_dean_cannot_book_until_optional_permission_is_granted(): void
    {
        $dean = $this->userFor(Role::DEAN_OFFICE_HEAD);

        $this->assertFalse($dean->allows(Permission::EVENT_BOOKINGS_CREATE));
        $this->assertFalse($dean->allows(Permission::VEHICLE_BOOKINGS_CREATE));
        $this->assertNotContains('booking_management', $dean->visibleSidebarGroups());
        $this->assertContains('user_management', $dean->visibleSidebarGroups());
        $this->assertContains('approval_management', $dean->visibleSidebarGroups());
        $this->assertFalse($dean->allows(Permission::ROLES_VIEW));
        $this->assertFalse($dean->allows(Permission::OFFICES_VIEW));

        $dean->grantOptionalPermission(Permission::EVENT_BOOKINGS_CREATE);

        $this->assertTrue($dean->fresh()->load('role')->allows(Permission::EVENT_BOOKINGS_CREATE));
        $this->assertContains('booking_management', $dean->fresh()->load('role')->visibleSidebarGroups());
    }

    public function test_dean_cannot_access_another_office(): void
    {
        $dean = $this->userFor(Role::DEAN_OFFICE_HEAD, $this->officeA);

        $this->assertTrue($dean->allows(Permission::USERS_VIEW, [
            'office_id' => $this->officeA->office_id,
        ]));

        $this->assertFalse($dean->allows(Permission::USERS_VIEW, [
            'office_id' => $this->officeB->office_id,
        ]));

        $this->assertFalse($dean->allows(Permission::EVENT_APPROVALS_APPROVE, [
            'office_id' => $this->officeB->office_id,
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
        ]));
    }

    public function test_faculty_cannot_modify_another_users_booking(): void
    {
        $faculty = $this->userFor(Role::FACULTY_STAFF);
        $otherId = $faculty->user_id + 99;

        $this->assertTrue($faculty->allows(Permission::EVENT_BOOKINGS_EDIT, [
            'owner_id' => $faculty->user_id,
        ]));

        $this->assertFalse($faculty->allows(Permission::EVENT_BOOKINGS_EDIT, [
            'owner_id' => $otherId,
        ]));
    }

    public function test_student_republic_cannot_book_vehicles(): void
    {
        $student = $this->userFor(Role::STUDENT_REPUBLIC);

        $this->assertTrue($student->allows(Permission::EVENT_BOOKINGS_CREATE));
        $this->assertFalse($student->allows(Permission::VEHICLE_BOOKINGS_CREATE));
        $this->assertFalse($student->allows(Permission::VEHICLE_APPROVALS_VIEW));
        $this->assertContains('booking_management', $student->visibleSidebarGroups());
    }

    public function test_approval_admins_are_limited_to_their_stage_and_pipeline(): void
    {
        $eventApprover = $this->userFor(Role::EVENT_APPROVAL_ADMIN);
        $vehicleApprover = $this->userFor(Role::VEHICLE_APPROVAL_ADMIN);
        $eventAdmin = $this->userFor(Role::EVENT_ADMIN);

        $this->assertTrue($eventApprover->allows(Permission::EVENT_APPROVALS_APPROVE, [
            'approval_stage' => ApprovalStage::EVENT_APPROVAL,
            'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
        ]));

        $this->assertFalse($eventApprover->allows(Permission::EVENT_APPROVALS_APPROVE, [
            'approval_stage' => ApprovalStage::EVENT_ADMIN,
            'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
        ]));

        $this->assertFalse($eventApprover->allows(Permission::VEHICLE_APPROVALS_APPROVE));

        $this->assertTrue($vehicleApprover->allows(Permission::VEHICLE_APPROVALS_APPROVE, [
            'approval_stage' => ApprovalStage::VEHICLE_APPROVAL,
            'approval_pipeline' => ApprovalStage::PIPELINE_VEHICLE,
        ]));

        $this->assertFalse($vehicleApprover->allows(Permission::EVENT_APPROVALS_APPROVE));

        $this->assertTrue($eventAdmin->allows(Permission::EVENT_APPROVALS_APPROVE, [
            'approval_stage' => ApprovalStage::EVENT_ADMIN,
        ]));

        $this->assertFalse($eventAdmin->allows(Permission::EVENT_APPROVALS_APPROVE, [
            'approval_stage' => ApprovalStage::SUPER_ADMIN,
        ]));
    }

    public function test_super_admin_booking_requires_explicit_emergency_bypass(): void
    {
        $admin = $this->userFor(Role::SUPER_ADMIN);

        $this->assertTrue($admin->hasEmergencyBypass());
        $this->assertFalse($admin->allows(Permission::EVENT_BOOKINGS_CREATE));
        $this->assertFalse($admin->allows(Permission::VEHICLE_BOOKINGS_CREATE));
        $this->assertTrue($admin->allowsWithEmergencyBypass(Permission::EVENT_BOOKINGS_CREATE));
        $this->assertTrue($admin->allowsWithEmergencyBypass(Permission::VEHICLE_BOOKINGS_CREATE));

        $this->assertFalse($admin->allows(Permission::EVENT_APPROVALS_APPROVE, [
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
        ]));

        $this->assertTrue($admin->allowsWithEmergencyBypass(
            Permission::EVENT_APPROVALS_APPROVE,
            new PermissionContext(
                approvalStage: ApprovalStage::OFFICE_HEAD,
                approvalPipeline: ApprovalStage::PIPELINE_EVENT,
            )
        ));
    }

    public function test_faculty_and_event_admin_cannot_use_emergency_bypass(): void
    {
        $faculty = $this->userFor(Role::FACULTY_STAFF);
        $eventAdmin = $this->userFor(Role::EVENT_ADMIN);

        $this->assertFalse($faculty->hasEmergencyBypass());
        $this->assertFalse($eventAdmin->hasEmergencyBypass());

        $this->assertFalse($faculty->allowsWithEmergencyBypass(Permission::ROLES_VIEW));
        $this->assertFalse($eventAdmin->allowsWithEmergencyBypass(Permission::EVENT_BOOKINGS_CREATE));

        $this->assertTrue($faculty->allowsWithEmergencyBypass(Permission::EVENT_BOOKINGS_CREATE));
        $this->assertTrue($faculty->allows(Permission::EVENT_BOOKINGS_CREATE));
    }

    public function test_authorize_permission_aborts_with_403(): void
    {
        $student = $this->userFor(Role::STUDENT_REPUBLIC);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        $student->authorizePermission(Permission::VEHICLE_BOOKINGS_CREATE);
    }

    public function test_custom_roles_receive_no_catalog_permissions(): void
    {
        $role = Role::create([
            'name' => 'Custom Reviewer',
            'slug' => 'custom-reviewer',
            'status' => 'active',
            'is_system_role' => false,
            'is_deleted' => false,
        ]);

        $user = $this->makeUser($role, $this->officeA);

        $this->assertFalse($user->allows(Permission::DASHBOARD_VIEW));
        $this->assertSame([], $user->grantedAbilities());
    }

    private function userFor(string $slug, ?Office $office = null): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();

        return $this->makeUser($role, $office ?? $this->officeA);
    }

    private function makeUser(Role $role, Office $office): User
    {
        return User::create([
            'first_name' => 'Test',
            'last_name' => $role->slug,
            'email' => $role->slug . '-' . uniqid() . '@example.com',
            'username' => $role->slug . '-' . uniqid(),
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }
}
