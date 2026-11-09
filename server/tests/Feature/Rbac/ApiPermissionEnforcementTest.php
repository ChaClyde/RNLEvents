<?php

namespace Tests\Feature\Rbac;

use App\Models\EventBooking;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Permissions\Permission;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ApiPermissionEnforcementTest extends TestCase
{
    use RefreshDatabase;

    private Office $officeA;
    private Office $officeB;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
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

        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }
    }

    #[DataProvider('protectedRoutesProvider')]
    public function test_unauthenticated_requests_are_rejected(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertUnauthorized();
    }

    public static function protectedRoutesProvider(): array
    {
        return [
            'roles list' => ['GET', '/api/roles/loadRoles'],
            'roles show' => ['GET', '/api/roles/getRole/1'],
            'roles store' => ['POST', '/api/roles/storeRole'],
            'roles update' => ['PUT', '/api/roles/updateRole/1'],
            'roles destroy' => ['DELETE', '/api/roles/destroyRole/1'],
            'roles trash' => ['GET', '/api/roles/trash'],
            'offices list' => ['GET', '/api/offices/loadOffices'],
            'offices store' => ['POST', '/api/offices/storeOffice'],
            'users list' => ['GET', '/api/users/loadUsers'],
            'users show' => ['GET', '/api/users/getUser/1'],
            'users store' => ['POST', '/api/users/storeUser'],
            'users update' => ['PUT', '/api/users/updateUser/1'],
            'users reset password' => ['PUT', '/api/users/resetPassword/1'],
            'users destroy' => ['DELETE', '/api/users/destroyUser/1'],
            'users trash' => ['GET', '/api/users/trash'],
            'users restore' => ['PUT', '/api/users/restoreUser/1'],
            'users force delete' => ['DELETE', '/api/users/forceDeleteUser/1'],
            'users photo' => ['GET', '/api/users/getProfilePhoto/1'],
            'users profile' => ['PUT', '/api/users/updateProfile'],
            'venues list' => ['GET', '/api/venues/loadVenues'],
            'venues store' => ['POST', '/api/venues/storeVenue'],
            'venues trash' => ['GET', '/api/venues/trash'],
            'events list' => ['GET', '/api/events/loadEvents'],
            'events store' => ['POST', '/api/events/storeEvent'],
            'vehicles list' => ['GET', '/api/vehicles/loadVehicles'],
            'vehicles store' => ['POST', '/api/vehicles/storeVehicle'],
            'vehicles trash' => ['GET', '/api/vehicles/trash'],
            'drivers list' => ['GET', '/api/drivers/loadDrivers'],
            'drivers store' => ['POST', '/api/drivers/storeDriver'],
            'drivers trash' => ['GET', '/api/drivers/trash'],
            'bookings list' => ['GET', '/api/event-bookings'],
            'bookings store' => ['POST', '/api/event-bookings/storeEventBooking'],
            'bookings show' => ['GET', '/api/event-bookings/1'],
            'bookings update' => ['PUT', '/api/event-bookings/updateEventBooking/1'],
            'bookings destroy' => ['DELETE', '/api/event-bookings/destroyEventBooking/1'],
            'bookings status' => ['PUT', '/api/event-bookings/updateStatus/1'],
            'bookings trash' => ['GET', '/api/event-bookings/trash'],
            'vehicle bookings list' => ['GET', '/api/vehicle-bookings'],
            'vehicle bookings store' => ['POST', '/api/vehicle-bookings/storeVehicleBooking'],
            'vehicle bookings show' => ['GET', '/api/vehicle-bookings/1'],
            'vehicle bookings update' => ['PUT', '/api/vehicle-bookings/updateVehicleBooking/1'],
            'vehicle bookings destroy' => ['DELETE', '/api/vehicle-bookings/destroyVehicleBooking/1'],
            'vehicle bookings status' => ['PUT', '/api/vehicle-bookings/updateStatus/1'],
            'vehicle bookings assign' => ['PUT', '/api/vehicle-bookings/assign/1'],
            'vehicle bookings trash' => ['GET', '/api/vehicle-bookings/trash'],
            'availability venues' => ['GET', '/api/availability/venues'],
            'availability vehicles' => ['GET', '/api/availability/vehicles'],
            'availability drivers' => ['GET', '/api/availability/drivers'],
            'calendar' => ['GET', '/api/calendar'],
            'dashboard' => ['GET', '/api/dashboard'],
            'event report summary' => ['GET', '/api/reports/events/summary'],
            'event report trends' => ['GET', '/api/reports/events/trends'],
            'event report venues' => ['GET', '/api/reports/events/venues'],
            'event report offices' => ['GET', '/api/reports/events/offices'],
            'event report bookings' => ['GET', '/api/reports/events/bookings'],
            'vehicle report summary' => ['GET', '/api/reports/vehicles/summary'],
            'vehicle report trends' => ['GET', '/api/reports/vehicles/trends'],
            'vehicle report utilization' => ['GET', '/api/reports/vehicles/utilization'],
            'vehicle report drivers' => ['GET', '/api/reports/vehicles/drivers'],
            'vehicle report offices' => ['GET', '/api/reports/vehicles/offices'],
            'vehicle report bookings' => ['GET', '/api/reports/vehicles/bookings'],
            'auth logout' => ['POST', '/api/auth/logout'],
            'auth me' => ['GET', '/api/auth/me'],
        ];
    }

    public function test_login_and_csrf_remain_public(): void
    {
        $this->get('/sanctum/csrf-cookie')->assertNoContent();

        $this->postJson('/api/auth/login', [
            'login' => 'nobody@example.com',
            'password' => 'wrong',
        ])->assertStatus(422);
    }

    public function test_super_admin_can_access_management_modules(): void
    {
        $admin = $this->asRole(Role::SUPER_ADMIN);

        $admin->getJson('/api/users/loadUsers')->assertOk();
        $admin->getJson('/api/roles/loadRoles')->assertOk();
        $admin->getJson('/api/offices/loadOffices')->assertOk();
        $admin->getJson('/api/venues/loadVenues')->assertOk();
        $admin->getJson('/api/events/loadEvents')->assertOk();
        $admin->getJson('/api/vehicles/loadVehicles')->assertOk();
        $admin->getJson('/api/drivers/loadDrivers')->assertOk();
        $admin->getJson('/api/event-bookings')->assertOk();
        $admin->getJson('/api/vehicle-bookings')->assertOk();
        $admin->getJson('/api/users/trash')->assertOk();
        $admin->getJson('/api/venues/trash')->assertOk();
    }

    public function test_event_admin_permissions(): void
    {
        $user = $this->asRole(Role::EVENT_ADMIN);

        $user->getJson('/api/venues/loadVenues')->assertOk();
        $user->getJson('/api/events/loadEvents')->assertOk();
        $user->getJson('/api/event-bookings')->assertOk();
        $user->postJson('/api/venues/storeVenue', [])->assertStatus(422);

        $user->getJson('/api/users/loadUsers')->assertForbidden();
        $user->getJson('/api/roles/loadRoles')->assertForbidden();
        $user->getJson('/api/vehicles/loadVehicles')->assertForbidden();
        $user->getJson('/api/drivers/loadDrivers')->assertForbidden();
        $user->getJson('/api/venues/trash')->assertForbidden();
        $user->postJson('/api/vehicles/storeVehicle', [])->assertForbidden();
    }

    public function test_vehicle_admin_permissions(): void
    {
        $user = $this->asRole(Role::VEHICLE_ADMIN);

        $user->getJson('/api/vehicles/loadVehicles')->assertOk();
        $user->getJson('/api/drivers/loadDrivers')->assertOk();
        $user->postJson('/api/drivers/storeDriver', [])->assertStatus(422);

        $user->getJson('/api/venues/loadVenues')->assertForbidden();
        $user->getJson('/api/events/loadEvents')->assertForbidden();
        $user->getJson('/api/event-bookings')->assertForbidden();
        $user->getJson('/api/users/loadUsers')->assertForbidden();
        $user->postJson('/api/event-bookings/storeEventBooking', [])->assertForbidden();
    }

    public function test_event_approval_admin_permissions(): void
    {
        $user = $this->asRole(Role::EVENT_APPROVAL_ADMIN);

        $user->getJson('/api/event-bookings')->assertOk();

        $user->getJson('/api/venues/loadVenues')->assertForbidden();
        $user->postJson('/api/event-bookings/storeEventBooking', [])->assertForbidden();
        $user->getJson('/api/users/loadUsers')->assertForbidden();
        $user->getJson('/api/vehicles/loadVehicles')->assertForbidden();
    }

    public function test_vehicle_approval_admin_permissions(): void
    {
        $user = $this->asRole(Role::VEHICLE_APPROVAL_ADMIN);

        $user->getJson('/api/event-bookings')->assertForbidden();
        $user->getJson('/api/vehicles/loadVehicles')->assertForbidden();
        $user->getJson('/api/users/loadUsers')->assertForbidden();
        $user->postJson('/api/event-bookings/storeEventBooking', [])->assertForbidden();
    }

    public function test_dean_office_head_permissions(): void
    {
        $user = $this->asRole(Role::DEAN_OFFICE_HEAD);

        $user->getJson('/api/users/loadUsers')->assertOk();
        $user->postJson('/api/users/storeUser', [])->assertStatus(422);

        $user->getJson('/api/roles/loadRoles')->assertForbidden();
        $user->getJson('/api/offices/loadOffices')->assertForbidden();
        $user->getJson('/api/venues/loadVenues')->assertForbidden();
        $user->getJson('/api/event-bookings')->assertOk();
        $user->postJson('/api/event-bookings/storeEventBooking', [])->assertForbidden();
        $user->getJson('/api/users/trash')->assertForbidden();
    }

    public function test_dean_optional_booking_grant_unlocks_booking_create(): void
    {
        $dean = $this->users[Role::DEAN_OFFICE_HEAD];
        $dean->grantOptionalPermission(Permission::EVENT_BOOKINGS_CREATE);
        $dean->grantOptionalPermission(Permission::EVENT_BOOKINGS_VIEW);

        $this->actingAs($dean, 'web')
            ->getJson('/api/event-bookings')
            ->assertOk();

        $this->actingAs($dean, 'web')
            ->postJson('/api/event-bookings/storeEventBooking', [
                'office_id' => $this->officeB->office_id,
            ])
            ->assertStatus(422);

        $this->actingAs($dean, 'web')
            ->postJson('/api/event-bookings/storeEventBooking', [
                'office_id' => $this->officeA->office_id,
            ])
            ->assertStatus(422);
    }

    public function test_dean_cannot_view_users_from_another_office(): void
    {
        $foreign = $this->userFor(Role::FACULTY_STAFF, $this->officeB);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->getJson('/api/users/getUser/' . $foreign->user_id)
            ->assertForbidden();

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->getJson('/api/users/getUser/' . $this->users[Role::DEAN_OFFICE_HEAD]->user_id)
            ->assertOk();
    }

    public function test_faculty_and_student_booking_permissions(): void
    {
        $faculty = $this->asRole(Role::FACULTY_STAFF);

        $faculty->getJson('/api/event-bookings')->assertOk();
        $faculty->postJson('/api/event-bookings/storeEventBooking', [])->assertStatus(422);
        $faculty->getJson('/api/vehicle-bookings')->assertOk();
        $faculty->postJson('/api/vehicle-bookings/storeVehicleBooking', [])->assertStatus(422);
        $faculty->getJson('/api/users/loadUsers')->assertForbidden();
        $faculty->getJson('/api/venues/loadVenues')->assertForbidden();
        $faculty->postJson('/api/users/storeUser', [])->assertForbidden();

        $student = $this->asRole(Role::STUDENT_REPUBLIC);

        $student->getJson('/api/event-bookings')->assertOk();
        $student->postJson('/api/event-bookings/storeEventBooking', [])->assertStatus(422);
        $student->getJson('/api/vehicle-bookings')->assertForbidden();
        $student->postJson('/api/vehicle-bookings/storeVehicleBooking', [])->assertForbidden();
        $student->getJson('/api/vehicles/loadVehicles')->assertForbidden();
        $student->getJson('/api/users/loadUsers')->assertForbidden();
        $student->postJson('/api/venues/storeVenue', [])->assertForbidden();
    }

    public function test_super_admin_emergency_bypass_is_explicit_and_limited(): void
    {
        $admin = $this->asRole(Role::SUPER_ADMIN);

        $admin->postJson('/api/event-bookings/storeEventBooking', [])
            ->assertForbidden();

        $admin->postJson('/api/vehicle-bookings/storeVehicleBooking', [])
            ->assertForbidden();

        $admin->withHeaders(['X-Emergency-Bypass' => '1'])
            ->postJson('/api/event-bookings/storeEventBooking', [])
            ->assertStatus(422);

        $admin->withHeaders(['X-Emergency-Bypass' => '1'])
            ->postJson('/api/vehicle-bookings/storeVehicleBooking', [])
            ->assertStatus(422);

        $admin->withHeaders(['X-Emergency-Bypass' => '1'])
            ->postJson('/api/users/storeUser', [])
            ->assertStatus(422);

        $faculty = $this->asRole(Role::FACULTY_STAFF);
        $faculty->withHeaders(['X-Emergency-Bypass' => '1'])
            ->getJson('/api/users/loadUsers')
            ->assertForbidden();
        $faculty->withHeaders(['X-Emergency-Bypass' => '1'])
            ->postJson('/api/users/storeUser', [])
            ->assertForbidden();
    }

    public function test_event_admin_cannot_use_emergency_bypass_to_create_bookings(): void
    {
        $this->asRole(Role::EVENT_ADMIN)
            ->withHeaders(['X-Emergency-Bypass' => '1'])
            ->postJson('/api/event-bookings/storeEventBooking', [])
            ->assertForbidden();
    }

    public function test_authenticated_users_can_update_their_own_profile(): void
    {
        $faculty = $this->users[Role::FACULTY_STAFF];

        $this->actingAs($faculty, 'web')
            ->putJson('/api/users/updateProfile', [])
            ->assertStatus(422);

        $this->actingAs($faculty, 'web')
            ->putJson('/api/users/updateUser/' . $this->users[Role::SUPER_ADMIN]->user_id, [])
            ->assertForbidden();
    }

    public function test_system_roles_cannot_be_deleted_even_by_super_admin(): void
    {
        $role = Role::where('slug', Role::EVENT_ADMIN)->firstOrFail();

        $this->asRole(Role::SUPER_ADMIN)
            ->deleteJson('/api/roles/destroyRole/' . $role->role_id)
            ->assertStatus(422)
            ->assertJsonPath('message', 'System roles cannot be deleted.');
    }

    public function test_event_booking_status_uses_approval_permission(): void
    {
        $booking = $this->makeBooking();

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk();

        $booking->update(['status' => 'pending', 'approval_stage' => 'office_head']);

        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();
    }

    public function test_super_admin_crud_still_works_for_offices(): void
    {
        $response = $this->asRole(Role::SUPER_ADMIN)
            ->postJson('/api/offices/storeOffice', [
                'office_code' => 'NEW-1',
                'office_name' => 'New Office',
                'status' => 'active',
            ]);

        $this->assertTrue(
            in_array($response->status(), [200, 201], true),
            'Office create should succeed for Super Admin. Got ' . $response->status() . ' ' . $response->getContent()
        );
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
            'first_name' => 'Test',
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

    private function makeBooking(): EventBooking
    {
        $venue = Venue::create([
            'venue' => 'Test Hall',
            'capacity' => 50,
            'location' => 'Main Building',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        return EventBooking::create([
            'venue_id' => $venue->venue_id,
            'purpose' => 'Faculty event',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '10:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 10,
            'requested_by' => 'Faculty User',
            'office_id' => $this->officeA->office_id,
            'email' => 'faculty@example.com',
            'tel_number' => '1234567',
            'status' => 'pending',
            'approval_stage' => 'office_head',
            'is_deleted' => false,
        ]);
    }
}
