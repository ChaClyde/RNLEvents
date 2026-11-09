<?php

namespace Tests\Feature\Rbac;

use App\Models\Event;
use App\Models\EventBooking;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ApiSecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private Office $officeA;
    private Office $officeB;
    private Venue $venue;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->officeA = Office::create([
            'office_code' => 'SEC-A',
            'office_name' => 'Security Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->officeB = Office::create([
            'office_code' => 'SEC-B',
            'office_name' => 'Security Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->venue = Venue::create([
            'venue' => 'Security Hall',
            'capacity' => 40,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }
    }

    #[DataProvider('eightRolesProvider')]
    public function test_each_role_is_denied_unrelated_management_routes(string $slug): void
    {
        $actor = $this->asRole($slug);

        if ($slug === Role::SUPER_ADMIN) {
            $actor->getJson('/api/roles/loadRoles')->assertOk();
        } else {
            $actor->getJson('/api/roles/loadRoles')->assertForbidden();
        }

        if (!in_array($slug, [Role::SUPER_ADMIN, Role::DEAN_OFFICE_HEAD], true)) {
            $actor->getJson('/api/users/loadUsers')->assertForbidden();
            $actor->postJson('/api/users/storeUser', [])->assertForbidden();
        }

        if (!in_array($slug, [
            Role::SUPER_ADMIN,
            Role::EVENT_ADMIN,
            Role::FACULTY_STAFF,
            Role::STUDENT_REPUBLIC,
            Role::EVENT_APPROVAL_ADMIN,
            Role::DEAN_OFFICE_HEAD,
        ], true)) {
            $actor->getJson('/api/event-bookings')->assertForbidden();
        }

        $actor->withHeaders(['X-Emergency-Bypass' => '1'])
            ->getJson('/api/roles/loadRoles');

        if ($slug !== Role::SUPER_ADMIN) {
            $this->asRole($slug)
                ->withHeaders(['X-Emergency-Bypass' => '1'])
                ->getJson('/api/roles/loadRoles')
                ->assertForbidden();
        }
    }

    public static function eightRolesProvider(): array
    {
        return [
            'super-admin' => [Role::SUPER_ADMIN],
            'event-admin' => [Role::EVENT_ADMIN],
            'vehicle-admin' => [Role::VEHICLE_ADMIN],
            'event-approval-admin' => [Role::EVENT_APPROVAL_ADMIN],
            'vehicle-approval-admin' => [Role::VEHICLE_APPROVAL_ADMIN],
            'dean-office-head' => [Role::DEAN_OFFICE_HEAD],
            'faculty-staff' => [Role::FACULTY_STAFF],
            'student-republic' => [Role::STUDENT_REPUBLIC],
        ];
    }

    public function test_dean_cannot_assign_super_admin_or_global_admin_roles(): void
    {
        $superAdminRole = Role::where('slug', Role::SUPER_ADMIN)->firstOrFail();
        $eventAdminRole = Role::where('slug', Role::EVENT_ADMIN)->firstOrFail();
        $facultyRole = Role::where('slug', Role::FACULTY_STAFF)->firstOrFail();

        $payload = [
            'first_name' => 'Escalated',
            'last_name' => 'User',
            'email' => 'escalated@example.com',
            'username' => 'escalateduser',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'office_id' => $this->officeA->office_id,
        ];

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->postJson('/api/users/storeUser', $payload + ['role_id' => $superAdminRole->role_id])
            ->assertForbidden();

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->postJson('/api/users/storeUser', $payload + [
                'email' => 'escalated-event@example.com',
                'username' => 'escalatedevent',
                'role_id' => $eventAdminRole->role_id,
            ])
            ->assertForbidden();

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/users/updateUser/' . $this->users[Role::FACULTY_STAFF]->user_id, [
                'first_name' => 'Faculty',
                'last_name' => Role::FACULTY_STAFF,
                'email' => $this->users[Role::FACULTY_STAFF]->email,
                'username' => $this->users[Role::FACULTY_STAFF]->username,
                'role_id' => $superAdminRole->role_id,
                'office_id' => $this->officeA->office_id,
                'account_status' => 'Active',
            ])
            ->assertForbidden();

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->postJson('/api/users/storeUser', $payload + [
                'email' => 'office-faculty@example.com',
                'username' => 'officefaculty',
                'role_id' => $facultyRole->role_id,
            ])
            ->assertCreated();
    }

    public function test_client_cannot_spoof_approval_stage_or_booking_status(): void
    {
        $faculty = $this->users[Role::FACULTY_STAFF];
        $booking = $this->makeBooking($faculty);

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'cancelled',
                'cancellation_reason' => 'Changed plans',
                'approval_stage' => 'super_admin',
            ])
            ->assertOk();

        $this->assertSame('cancelled', $booking->fresh()->status);
        $this->assertSame('office_head', $booking->fresh()->approval_stage);

        $pending = $this->makeBooking($faculty);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/' . $pending->event_booking_id, [
                'status' => 'approved',
                'approval_stage' => 'super_admin',
            ])
            ->assertOk();

        $this->assertSame('pending', $pending->fresh()->status);
        $this->assertSame('event_approval', $pending->fresh()->approval_stage);
    }

    public function test_emergency_bypass_cannot_be_granted_by_headers_or_parameters_alone(): void
    {
        $faculty = $this->asRole(Role::FACULTY_STAFF);

        $faculty->withHeaders(['X-Emergency-Bypass' => '1'])
            ->postJson('/api/event-bookings/storeEventBooking', [])
            ->assertStatus(422);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->withHeaders(['X-Emergency-Bypass' => 'true'])
            ->postJson('/api/event-bookings/storeEventBooking', [])
            ->assertForbidden();

        $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/users/storeUser?emergency_bypass=1', [])
            ->assertForbidden();

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/users/updateProfile', [
                'first_name' => 'Faculty',
                'last_name' => 'Staff',
                'email' => $this->users[Role::FACULTY_STAFF]->email,
                'username' => $this->users[Role::FACULTY_STAFF]->username,
                'emergency_bypass' => true,
                'role_id' => $this->users[Role::SUPER_ADMIN]->role_id,
            ])
            ->assertOk();

        $this->assertSame(
            $this->users[Role::FACULTY_STAFF]->role_id,
            $this->users[Role::FACULTY_STAFF]->fresh()->role_id,
        );
    }

    public function test_mass_assignment_cannot_override_protected_user_fields(): void
    {
        $facultyRole = Role::where('slug', Role::FACULTY_STAFF)->firstOrFail();

        $created = $this->asRole(Role::SUPER_ADMIN)
            ->postJson('/api/users/storeUser', [
                'first_name' => 'Guarded',
                'last_name' => 'User',
                'email' => 'guarded@example.com',
                'username' => 'guardeduser',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role_id' => $facultyRole->role_id,
                'office_id' => $this->officeA->office_id,
                'is_deleted' => true,
                'optional_permissions' => ['users.view'],
                'last_login_at' => '2020-01-01 00:00:00',
            ])
            ->assertCreated()
            ->json('user');

        $this->assertFalse((bool) $created['is_deleted']);
        $this->assertArrayNotHasKey('password', $created);
        $this->assertNull(User::find($created['user_id'])->last_login_at);
        $this->assertSame([], User::find($created['user_id'])->optional_permissions ?? []);

        $faculty = $this->users[Role::FACULTY_STAFF];

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/users/updateProfile', [
                'first_name' => $faculty->first_name,
                'last_name' => $faculty->last_name,
                'email' => $faculty->email,
                'username' => $faculty->username,
                'role_id' => $this->users[Role::SUPER_ADMIN]->role_id,
                'office_id' => $this->officeB->office_id,
                'account_status' => 'Inactive',
                'is_deleted' => true,
                'is_system_role' => true,
            ])
            ->assertOk();

        $fresh = $faculty->fresh();
        $this->assertSame($faculty->role_id, $fresh->role_id);
        $this->assertSame($this->officeA->office_id, $fresh->office_id);
        $this->assertSame('Active', $fresh->account_status);
        $this->assertFalse($fresh->is_deleted);
    }

    public function test_booking_create_ignores_status_and_owner_spoofing(): void
    {
        $faculty = $this->users[Role::FACULTY_STAFF];
        $other = $this->users[Role::STUDENT_REPUBLIC];

        $created = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', [
                'venue_id' => $this->venue->venue_id,
                'purpose' => 'Spoofed booking',
                'date_start' => now()->toDateString(),
                'date_end' => now()->toDateString(),
                'time_start' => '08:00',
                'time_end' => '09:00',
                'expected_attendees' => 4,
                'requested_by' => 'Someone Else',
                'requested_by_user_id' => $other->user_id,
                'office_id' => $this->officeB->office_id,
                'email' => $faculty->email,
                'tel_number' => '1111111',
                'status' => 'approved',
                'approval_stage' => 'super_admin',
                'is_deleted' => true,
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame($faculty->user_id, $created['requested_by_user_id']);
        $this->assertSame($this->officeA->office_id, $created['office_id']);
        $this->assertSame('pending', $created['status']);
        $this->assertSame('office_head', $created['approval_stage']);
        $this->assertFalse((bool) EventBooking::find($created['event_booking_id'])->is_deleted);
    }

    public function test_deleted_calendar_events_are_not_readable_by_id(): void
    {
        $event = Event::create([
            'purpose' => 'Soft-deleted event',
            'venue_id' => $this->venue->venue_id,
            'time_start' => '09:00:00',
            'time_end' => '10:00:00',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'number_of_days' => 1,
            'chairs' => 0,
            'requested_by' => 'Admin',
            'office_id' => $this->officeA->office_id,
            'email' => 'events@example.com',
            'tel_number' => '0000000',
            'is_deleted' => true,
        ]);

        $this->asRole(Role::SUPER_ADMIN)
            ->getJson('/api/events/getEvent/' . $event->event_id)
            ->assertNotFound();

        $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/events/getEvent/' . $event->event_id)
            ->assertForbidden();

        $this->asRole(Role::EVENT_ADMIN)
            ->getJson('/api/events/loadEvents')
            ->assertOk()
            ->assertJsonMissing(['event_id' => $event->event_id]);
    }

    public function test_system_roles_cannot_be_deactivated_or_spoofed_as_system(): void
    {
        $system = Role::where('slug', Role::VEHICLE_ADMIN)->firstOrFail();

        $this->asRole(Role::SUPER_ADMIN)
            ->putJson('/api/roles/updateRole/' . $system->role_id, [
                'name' => 'Hijacked',
                'status' => 'inactive',
                'is_system_role' => false,
                'is_deleted' => true,
            ])
            ->assertOk();

        $this->asRole(Role::SUPER_ADMIN)
            ->putJson('/api/roles/deactivateRole/' . $system->role_id)
            ->assertStatus(422);

        $fresh = $system->fresh();
        $this->assertSame(Role::VEHICLE_ADMIN, $fresh->slug);
        $this->assertTrue((bool) $fresh->is_system_role);
        $this->assertFalse((bool) $fresh->is_deleted);
        $this->assertSame('active', $fresh->status);

        $created = $this->asRole(Role::SUPER_ADMIN)
            ->postJson('/api/roles/storeRole', [
                'name' => 'Custom Role',
                'description' => 'Not a system role',
                'status' => 'active',
                'is_system_role' => true,
            ])
            ->assertCreated()
            ->json('role');

        $this->assertFalse((bool) $created['is_system_role']);
    }

    public function test_last_super_admin_cannot_be_deleted_or_deactivated(): void
    {
        $onlyAdmin = $this->users[Role::SUPER_ADMIN];

        $this->asRole(Role::SUPER_ADMIN)
            ->putJson('/api/users/updateUser/' . $onlyAdmin->user_id, [
                'first_name' => $onlyAdmin->first_name,
                'last_name' => $onlyAdmin->last_name,
                'email' => $onlyAdmin->email,
                'username' => $onlyAdmin->username,
                'role_id' => $this->users[Role::FACULTY_STAFF]->role_id,
                'office_id' => $onlyAdmin->office_id,
                'account_status' => 'Active',
            ])
            ->assertStatus(422);

        $this->asRole(Role::SUPER_ADMIN)
            ->putJson('/api/users/updateUser/' . $onlyAdmin->user_id, [
                'first_name' => $onlyAdmin->first_name,
                'last_name' => $onlyAdmin->last_name,
                'email' => $onlyAdmin->email,
                'username' => $onlyAdmin->username,
                'role_id' => $onlyAdmin->role_id,
                'office_id' => $onlyAdmin->office_id,
                'account_status' => 'Inactive',
            ])
            ->assertStatus(422);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->deleteJson('/api/users/destroyUser/' . $onlyAdmin->user_id)
            ->assertStatus(422);
    }

    public function test_inactive_session_is_blocked_from_authenticated_apis_but_can_logout(): void
    {
        $faculty = $this->users[Role::FACULTY_STAFF];

        $headers = [
            'Origin' => 'http://localhost:5173',
            'Referer' => 'http://localhost:5173/',
            'Accept' => 'application/json',
        ];

        $this->withHeaders($headers)
            ->postJson('/api/auth/login', [
                'login' => $faculty->email,
                'password' => 'password',
            ])
            ->assertOk();

        $faculty->forceFill(['account_status' => 'Inactive'])->save();

        $this->withHeaders($headers)->getJson('/api/auth/me')->assertForbidden();
        $this->withHeaders($headers)->getJson('/api/event-bookings')->assertForbidden();
        $this->withHeaders($headers)
            ->putJson('/api/users/updateProfile', [
                'first_name' => $faculty->first_name,
                'last_name' => $faculty->last_name,
                'email' => $faculty->email,
                'username' => $faculty->username,
            ])
            ->assertForbidden();

        $this->withHeaders($headers)->postJson('/api/auth/logout')->assertOk();
    }

    public function test_users_json_never_includes_password_hashes(): void
    {
        $response = $this->asRole(Role::SUPER_ADMIN)
            ->getJson('/api/users/loadUsers')
            ->assertOk()
            ->json('users');

        $this->assertNotEmpty($response);
        $this->assertArrayNotHasKey('password', $response[0]);
    }

    private function asRole(string $slug)
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        return $this->actingAs($this->users[$slug], 'web');
    }

    private function userFor(string $slug, ?Office $office = null): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();
        $office ??= $this->officeA;

        return User::create([
            'first_name' => 'Sec',
            'last_name' => $slug,
            'email' => $slug . '-' . uniqid() . '@example.com',
            'username' => $slug . '-' . uniqid(),
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }

    private function makeBooking(User $owner): EventBooking
    {
        return EventBooking::create([
            'venue_id' => $this->venue->venue_id,
            'purpose' => 'Hardening booking',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '11:00:00',
            'time_end' => '12:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 8,
            'requested_by' => $owner->first_name . ' ' . $owner->last_name,
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'email' => $owner->email,
            'tel_number' => '2222222',
            'status' => 'pending',
            'approval_stage' => 'office_head',
            'is_deleted' => false,
        ]);
    }
}
