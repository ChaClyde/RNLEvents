<?php

namespace Tests\Feature\Rbac;

use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Permissions\ApprovalStage;
use App\Permissions\Permission;
use App\Permissions\PermissionChecker;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;
use Tests\TestCase;

class PermissionRulesTest extends TestCase
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

    public function test_every_ability_for_every_role_matches_the_independent_matrix(): void
    {
        foreach ($this->expectedGrantedAbilities() as $roleSlug => $expected) {
            $user = $this->userFor($roleSlug);

            $this->assertEqualsCanonicalizing(
                $expected,
                $user->grantedAbilities(),
                "Granted abilities mismatch for {$roleSlug}"
            );

            foreach (Permission::all() as $ability) {
                $shouldAllow = in_array($ability, $expected, true);

                $this->assertSame(
                    $shouldAllow,
                    $user->allows($ability),
                    "{$roleSlug} {$ability} allow() mismatch"
                );
            }
        }
    }

    public function test_sidebar_groups_match_each_role(): void
    {
        $this->assertEqualsCanonicalizing([
            'dashboard',
            'user_management',
            'event_management',
            'vehicle_management',
            'booking_management',
            'approval_management',
            'reports',
            'system_history',
            'audit_logs',
            'messenger',
            'settings',
            'trash',
        ], $this->userFor(Role::SUPER_ADMIN)->visibleSidebarGroups());

        $this->assertEqualsCanonicalizing([
            'dashboard',
            'event_management',
            'booking_management',
            'approval_management',
            'reports',
            'messenger',
        ], $this->userFor(Role::EVENT_ADMIN)->visibleSidebarGroups());

        $this->assertEqualsCanonicalizing([
            'dashboard',
            'vehicle_management',
            'booking_management',
            'approval_management',
            'reports',
            'messenger',
        ], $this->userFor(Role::VEHICLE_ADMIN)->visibleSidebarGroups());

        $this->assertEqualsCanonicalizing([
            'dashboard',
            'booking_management',
            'approval_management',
            'reports',
            'messenger',
        ], $this->userFor(Role::EVENT_APPROVAL_ADMIN)->visibleSidebarGroups());

        $this->assertEqualsCanonicalizing([
            'dashboard',
            'booking_management',
            'approval_management',
            'reports',
            'messenger',
        ], $this->userFor(Role::VEHICLE_APPROVAL_ADMIN)->visibleSidebarGroups());

        $this->assertEqualsCanonicalizing([
            'dashboard',
            'user_management',
            'approval_management',
            'reports',
            'messenger',
        ], $this->userFor(Role::DEAN_OFFICE_HEAD)->visibleSidebarGroups());

        $this->assertEqualsCanonicalizing([
            'dashboard',
            'booking_management',
            'approval_management',
            'messenger',
        ], $this->userFor(Role::FACULTY_STAFF)->visibleSidebarGroups());

        $this->assertEqualsCanonicalizing([
            'dashboard',
            'booking_management',
            'approval_management',
            'messenger',
        ], $this->userFor(Role::STUDENT_REPUBLIC)->visibleSidebarGroups());
    }

    public function test_inactive_deleted_and_inactive_role_users_are_denied(): void
    {
        $user = $this->userFor(Role::FACULTY_STAFF);
        $this->assertTrue($user->allows(Permission::EVENT_BOOKINGS_CREATE));

        $user->account_status = 'Inactive';
        $this->assertFalse($user->allows(Permission::EVENT_BOOKINGS_CREATE));

        $user->account_status = 'Active';
        $user->is_deleted = true;
        $this->assertFalse($user->allows(Permission::EVENT_BOOKINGS_CREATE));

        $user->is_deleted = false;
        $user->role->status = 'inactive';
        $user->role->save();
        $user->unsetRelation('role');
        $this->assertFalse($user->fresh()->load('role')->allows(Permission::EVENT_BOOKINGS_CREATE));
    }

    public function test_optional_permissions_can_be_granted_and_revoked_only_for_dean_booking(): void
    {
        $dean = $this->userFor(Role::DEAN_OFFICE_HEAD);
        $faculty = $this->userFor(Role::FACULTY_STAFF);

        try {
            $faculty->grantOptionalPermission(Permission::EVENT_BOOKINGS_CREATE);
            $this->fail('Faculty must not receive optional booking grants.');
        } catch (InvalidArgumentException) {
            $this->assertFalse($faculty->hasOptionalPermission(Permission::EVENT_BOOKINGS_CREATE));
        }

        $dean->grantOptionalPermission(Permission::EVENT_BOOKINGS_CREATE);
        $dean->grantOptionalPermission(Permission::VEHICLE_BOOKINGS_CREATE);

        $dean = $dean->fresh()->load('role');
        $this->assertTrue($dean->hasOptionalPermission(Permission::EVENT_BOOKINGS_CREATE));
        $this->assertTrue($dean->allows(Permission::EVENT_BOOKINGS_CREATE, [
            'office_id' => $this->officeA->office_id,
        ]));
        $this->assertFalse($dean->allows(Permission::EVENT_BOOKINGS_CREATE, [
            'office_id' => $this->officeB->office_id,
        ]));
        $this->assertFalse($dean->allows(Permission::EVENT_BOOKINGS_VIEW));

        $dean->revokeOptionalPermission(Permission::EVENT_BOOKINGS_CREATE);
        $this->assertFalse($dean->fresh()->load('role')->allows(Permission::EVENT_BOOKINGS_CREATE));
    }

    public function test_dean_approval_is_office_and_step_one_only(): void
    {
        $dean = $this->userFor(Role::DEAN_OFFICE_HEAD, $this->officeA);

        $this->assertTrue($dean->allows(Permission::EVENT_APPROVALS_APPROVE, [
            'office_id' => $this->officeA->office_id,
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
        ]));

        $this->assertFalse($dean->allows(Permission::EVENT_APPROVALS_APPROVE, [
            'office_id' => $this->officeA->office_id,
            'approval_stage' => ApprovalStage::EVENT_ADMIN,
            'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
        ]));

        $this->assertFalse($dean->allows(Permission::USERS_CREATE, [
            'office_id' => $this->officeB->office_id,
        ]));
    }

    public function test_faculty_and_student_ownership_and_vehicle_split(): void
    {
        $faculty = $this->userFor(Role::FACULTY_STAFF);
        $student = $this->userFor(Role::STUDENT_REPUBLIC);

        $this->assertTrue($faculty->allows(Permission::VEHICLE_BOOKINGS_EDIT, [
            'owner_id' => $faculty->user_id,
        ]));
        $this->assertFalse($faculty->allows(Permission::VEHICLE_BOOKINGS_EDIT, [
            'owner_id' => $student->user_id,
        ]));
        $this->assertFalse($faculty->allows(Permission::EVENT_APPROVALS_APPROVE));

        $this->assertTrue($student->allows(Permission::EVENT_BOOKINGS_DELETE, [
            'owner_id' => $student->user_id,
        ]));
        $this->assertFalse($student->allows(Permission::EVENT_BOOKINGS_DELETE, [
            'owner_id' => $faculty->user_id,
        ]));
        $this->assertFalse($student->allows(Permission::VEHICLE_BOOKINGS_VIEW));
    }

    public function test_reports_are_limited_only_for_approval_admins(): void
    {
        $eventApprover = $this->userFor(Role::EVENT_APPROVAL_ADMIN);
        $eventAdmin = $this->userFor(Role::EVENT_ADMIN);
        $dean = $this->userFor(Role::DEAN_OFFICE_HEAD);

        $this->assertTrue($eventApprover->isLimited(Permission::REPORTS_VIEW_EVENT));
        $this->assertFalse($eventAdmin->isLimited(Permission::REPORTS_VIEW_EVENT));
        $this->assertFalse($eventApprover->allows(Permission::REPORTS_VIEW_ALL));
        $this->assertFalse($dean->allows(Permission::REPORTS_VIEW_EVENT));
        $this->assertTrue($dean->allows(Permission::REPORTS_VIEW_OFFICE));
    }

    public function test_constrain_query_applies_office_and_own_scopes(): void
    {
        $dean = $this->userFor(Role::DEAN_OFFICE_HEAD);
        $faculty = $this->userFor(Role::FACULTY_STAFF);
        $admin = $this->userFor(Role::SUPER_ADMIN);
        $checker = app(PermissionChecker::class);

        $deanSql = $checker->constrainQuery(User::query(), $dean, Permission::USERS_VIEW)->toSql();
        $this->assertStringContainsString('office_id', $deanSql);

        $facultySql = $checker->constrainQuery(
            User::query(),
            $faculty,
            Permission::EVENT_BOOKINGS_VIEW,
            ['owner_id' => 'user_id']
        )->toSql();
        $this->assertStringContainsString('user_id', $facultySql);

        $adminCreateSql = $checker->constrainQuery(
            User::query(),
            $admin,
            Permission::EVENT_BOOKINGS_CREATE
        )->toSql();
        $this->assertStringContainsString('1 = 0', $adminCreateSql);
    }

    public function test_super_admin_payload_exposes_bypass_without_granting_booking_create(): void
    {
        $admin = $this->userFor(Role::SUPER_ADMIN);
        $payload = $admin->permissionPayload();

        $this->assertTrue($payload['has_emergency_bypass']);
        $this->assertArrayNotHasKey(Permission::EVENT_BOOKINGS_CREATE, $payload['abilities']);
        $this->assertArrayHasKey(Permission::EMERGENCY_BYPASS, $payload['abilities']);
        $this->assertTrue($admin->can(Permission::ROLES_DELETE));
        $this->assertFalse($admin->can(Permission::EVENT_BOOKINGS_CREATE));
        $this->assertTrue($admin->can(Permission::EVENT_BOOKINGS_CREATE, [
            'emergency_bypass' => true,
        ]));
    }

    public function test_unknown_ability_is_denied_for_every_role(): void
    {
        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->assertFalse($this->userFor($slug)->allows('unknown.ability'));
        }
    }

    /**
     * Independent expected matrix. Do not derive this from PermissionCatalog.
     *
     * @return array<string, list<string>>
     */
    private function expectedGrantedAbilities(): array
    {
        return [
            Role::SUPER_ADMIN => array_merge(
                $this->crud('users'),
                $this->crud('roles'),
                $this->crud('offices'),
                $this->crud('venues'),
                $this->crud('events'),
                $this->crud('vehicles'),
                $this->crud('drivers'),
                [
                    Permission::DASHBOARD_VIEW,
                    Permission::EVENT_BOOKINGS_VIEW,
                    Permission::EVENT_BOOKINGS_EDIT,
                    Permission::EVENT_BOOKINGS_DELETE,
                    Permission::VEHICLE_BOOKINGS_VIEW,
                    Permission::VEHICLE_BOOKINGS_EDIT,
                    Permission::VEHICLE_BOOKINGS_DELETE,
                    Permission::EVENT_APPROVALS_VIEW,
                    Permission::EVENT_APPROVALS_APPROVE,
                    Permission::VEHICLE_APPROVALS_VIEW,
                    Permission::VEHICLE_APPROVALS_APPROVE,
                    Permission::MESSENGER_VIEW,
                    Permission::REPORTS_VIEW,
                    Permission::REPORTS_VIEW_ALL,
                    Permission::REPORTS_VIEW_EVENT,
                    Permission::REPORTS_VIEW_VEHICLE,
                    Permission::REPORTS_VIEW_OFFICE,
                    Permission::SYSTEM_HISTORY_VIEW,
                    Permission::AUDIT_LOGS_VIEW,
                    Permission::SETTINGS_VIEW,
                    Permission::SETTINGS_EDIT,
                    Permission::TRASH_VIEW,
                    Permission::TRASH_RESTORE,
                    Permission::TRASH_FORCE_DELETE,
                    Permission::EMERGENCY_BYPASS,
                ]
            ),
            Role::EVENT_ADMIN => array_merge(
                $this->crud('venues'),
                $this->crud('events'),
                [
                    Permission::DASHBOARD_VIEW,
                    Permission::EVENT_BOOKINGS_VIEW,
                    Permission::EVENT_APPROVALS_VIEW,
                    Permission::EVENT_APPROVALS_APPROVE,
                    Permission::MESSENGER_VIEW,
                    Permission::REPORTS_VIEW,
                    Permission::REPORTS_VIEW_EVENT,
                ]
            ),
            Role::VEHICLE_ADMIN => array_merge(
                $this->crud('vehicles'),
                $this->crud('drivers'),
                [
                    Permission::DASHBOARD_VIEW,
                    Permission::VEHICLE_BOOKINGS_VIEW,
                    Permission::VEHICLE_APPROVALS_VIEW,
                    Permission::VEHICLE_APPROVALS_APPROVE,
                    Permission::MESSENGER_VIEW,
                    Permission::REPORTS_VIEW,
                    Permission::REPORTS_VIEW_VEHICLE,
                ]
            ),
            Role::EVENT_APPROVAL_ADMIN => [
                Permission::DASHBOARD_VIEW,
                Permission::EVENT_BOOKINGS_VIEW,
                Permission::EVENT_APPROVALS_VIEW,
                Permission::EVENT_APPROVALS_APPROVE,
                Permission::MESSENGER_VIEW,
                Permission::REPORTS_VIEW,
                Permission::REPORTS_VIEW_EVENT,
            ],
            Role::VEHICLE_APPROVAL_ADMIN => [
                Permission::DASHBOARD_VIEW,
                Permission::VEHICLE_BOOKINGS_VIEW,
                Permission::VEHICLE_APPROVALS_VIEW,
                Permission::VEHICLE_APPROVALS_APPROVE,
                Permission::MESSENGER_VIEW,
                Permission::REPORTS_VIEW,
                Permission::REPORTS_VIEW_VEHICLE,
            ],
            Role::DEAN_OFFICE_HEAD => array_merge(
                $this->crud('users'),
                [
                    Permission::DASHBOARD_VIEW,
                    Permission::EVENT_APPROVALS_VIEW,
                    Permission::EVENT_APPROVALS_APPROVE,
                    Permission::VEHICLE_APPROVALS_VIEW,
                    Permission::VEHICLE_APPROVALS_APPROVE,
                    Permission::MESSENGER_VIEW,
                    Permission::REPORTS_VIEW,
                    Permission::REPORTS_VIEW_OFFICE,
                ]
            ),
            Role::FACULTY_STAFF => [
                Permission::DASHBOARD_VIEW,
                Permission::EVENT_BOOKINGS_VIEW,
                Permission::EVENT_BOOKINGS_CREATE,
                Permission::EVENT_BOOKINGS_EDIT,
                Permission::EVENT_BOOKINGS_DELETE,
                Permission::VEHICLE_BOOKINGS_VIEW,
                Permission::VEHICLE_BOOKINGS_CREATE,
                Permission::VEHICLE_BOOKINGS_EDIT,
                Permission::VEHICLE_BOOKINGS_DELETE,
                Permission::EVENT_APPROVALS_VIEW,
                Permission::VEHICLE_APPROVALS_VIEW,
                Permission::MESSENGER_VIEW,
            ],
            Role::STUDENT_REPUBLIC => [
                Permission::DASHBOARD_VIEW,
                Permission::EVENT_BOOKINGS_VIEW,
                Permission::EVENT_BOOKINGS_CREATE,
                Permission::EVENT_BOOKINGS_EDIT,
                Permission::EVENT_BOOKINGS_DELETE,
                Permission::EVENT_APPROVALS_VIEW,
                Permission::MESSENGER_VIEW,
            ],
        ];
    }

    /**
     * @return list<string>
     */
    private function crud(string $module): array
    {
        return [
            $module . '.view',
            $module . '.create',
            $module . '.edit',
            $module . '.delete',
        ];
    }

    private function userFor(string $slug, ?Office $office = null): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();

        return User::create([
            'first_name' => 'Test',
            'last_name' => $slug,
            'email' => $slug . '-' . uniqid() . '@example.com',
            'username' => $slug . '-' . uniqid(),
            'password' => Hash::make('password'),
            'office_id' => ($office ?? $this->officeA)->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }
}
