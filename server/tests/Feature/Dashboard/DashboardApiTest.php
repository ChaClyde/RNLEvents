<?php

namespace Tests\Feature\Dashboard;

use App\Models\Driver;
use App\Models\EventBooking;
use App\Models\EventBookingApproval;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Models\Venue;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    private Office $officeA;
    private Office $officeB;
    private Venue $venue;
    private Vehicle $vehicle;
    private Driver $driver;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->officeA = Office::create([
            'office_code' => 'DB-A',
            'office_name' => 'Dashboard Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->officeB = Office::create([
            'office_code' => 'DB-B',
            'office_name' => 'Dashboard Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->venue = Venue::create([
            'venue' => 'Dashboard Hall',
            'capacity' => 80,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->vehicle = Vehicle::create([
            'vehicle_name' => 'Dashboard Van',
            'plate_number' => 'DASH-001',
            'capacity' => 12,
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->driver = Driver::create([
            'driver_name' => 'Dashboard Driver',
            'driver_status' => 'Available',
            'is_deleted' => false,
        ]);

        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        $this->users['faculty-b'] = $this->userFor(Role::FACULTY_STAFF, $this->officeB, 'faculty-b');
        $this->users['dean-b'] = $this->userFor(Role::DEAN_OFFICE_HEAD, $this->officeB, 'dean-b');
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
    }

    public function test_authenticated_roles_can_load_their_dashboard(): void
    {
        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->asRole($slug)
                ->getJson('/api/dashboard')
                ->assertOk()
                ->assertJsonPath('data.role', $slug)
                ->assertJsonPath('data.user.full_name', $this->users[$slug]->full_name);
        }
    }

    public function test_super_admin_sees_system_wide_statistics(): void
    {
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Office A event',
            'status' => 'approved',
            'approval_stage' => ApprovalStage::SUPER_ADMIN,
        ]);
        $this->makeEventBooking($this->users['faculty-b'], [
            'purpose' => 'Office B event',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
        ]);
        $this->makeVehicleBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Office A trip',
            'status' => 'rejected',
        ]);

        $cards = $this->cards($this->asRole(Role::SUPER_ADMIN)->getJson('/api/dashboard')->assertOk());

        $this->assertSame(2, $cards['total_event_bookings']);
        $this->assertSame(1, $cards['total_vehicle_bookings']);
        $this->assertSame(1, $cards['pending_approvals']);
        $this->assertSame(1, $cards['approved_bookings']);
        $this->assertSame(1, $cards['rejected_bookings']);
        $this->assertGreaterThanOrEqual(8, $cards['total_users']);
        $this->assertSame(2, $cards['total_offices']);
    }

    public function test_dean_only_sees_own_office_data(): void
    {
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha event',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
        ]);
        $this->makeEventBooking($this->users['faculty-b'], [
            'purpose' => 'Bravo event',
            'status' => 'approved',
            'approval_stage' => ApprovalStage::SUPER_ADMIN,
        ]);
        $this->makeVehicleBooking($this->users['faculty-b'], [
            'purpose' => 'Bravo trip',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
        ]);

        $response = $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->getJson('/api/dashboard?office_id='.$this->officeB->office_id)
            ->assertOk();

        $cards = $this->cards($response);

        $this->assertSame(1, $cards['office_event_bookings']);
        $this->assertSame(0, $cards['office_vehicle_bookings']);
        $this->assertSame(1, $cards['pending_office_approvals']);

        $payload = $response->json('data');
        $encoded = json_encode($payload);

        $this->assertStringContainsString('Alpha event', $encoded);
        $this->assertStringNotContainsString('Bravo event', $encoded);
        $this->assertStringNotContainsString('Bravo trip', $encoded);
        $this->assertSame($this->officeA->office_name, $payload['user']['office']);
    }

    public function test_faculty_only_sees_own_bookings(): void
    {
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Mine',
            'status' => 'approved',
        ]);
        $this->makeEventBooking($this->users['faculty-b'], [
            'purpose' => 'Theirs',
            'status' => 'approved',
        ]);
        $this->makeVehicleBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'My trip',
            'status' => 'pending',
        ]);

        $response = $this->asRole(Role::FACULTY_STAFF)->getJson('/api/dashboard')->assertOk();
        $cards = $this->cards($response);

        $this->assertSame(1, $cards['my_event_requests']);
        $this->assertSame(1, $cards['my_vehicle_requests']);
        $this->assertSame(1, $cards['pending_requests']);
        $this->assertSame(1, $cards['approved_requests']);
        $this->assertStringNotContainsString('Theirs', json_encode($response->json('data')));
    }

    public function test_student_republic_cannot_access_vehicle_dashboard_information(): void
    {
        $this->makeEventBooking($this->users[Role::STUDENT_REPUBLIC], [
            'purpose' => 'Student event',
            'status' => 'pending',
        ]);
        $this->makeVehicleBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Hidden trip',
            'status' => 'approved',
        ]);

        $response = $this->asRole(Role::STUDENT_REPUBLIC)->getJson('/api/dashboard')->assertOk();
        $data = $response->json('data');
        $cards = $this->cards($response);

        $this->assertFalse($data['capabilities']['vehicles']);
        $this->assertSame(1, $cards['my_event_requests']);
        $this->assertArrayNotHasKey('my_vehicle_requests', $cards);
        $this->assertArrayNotHasKey('vehicle_trends', $data['charts']);
        $this->assertArrayNotHasKey('recent_vehicle_bookings', $data['sections']);
        $this->assertArrayNotHasKey('upcoming_trips', $data['sections']);
        $this->assertStringNotContainsString('Hidden trip', json_encode($data));
    }

    public function test_approval_admin_pending_counts_respect_approval_stages(): void
    {
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Waiting on dean',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
        ]);
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Waiting on event approval',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::EVENT_APPROVAL,
        ]);

        EventBookingApproval::create([
            'event_booking_id' => EventBooking::query()->latest('event_booking_id')->first()->event_booking_id,
            'approver_user_id' => $this->users[Role::EVENT_APPROVAL_ADMIN]->user_id,
            'approval_stage' => ApprovalStage::EVENT_APPROVAL,
            'action' => EventBookingApproval::ACTION_APPROVED,
        ]);

        $cards = $this->cards(
            $this->asRole(Role::EVENT_APPROVAL_ADMIN)->getJson('/api/dashboard')->assertOk()
        );

        $this->assertSame(1, $cards['pending_event_approvals']);
        $this->assertSame(1, $cards['approved_event_reviews']);
        $this->assertSame(1, $cards['total_events_reviewed']);
    }

    public function test_soft_deleted_records_are_excluded(): void
    {
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Live booking',
            'status' => 'approved',
        ]);
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Trashed booking',
            'status' => 'approved',
            'is_deleted' => true,
        ]);

        $inactive = $this->userFor(Role::FACULTY_STAFF, $this->officeA, 'inactive-user');
        $inactive->update(['account_status' => 'Inactive']);
        $this->userFor(Role::FACULTY_STAFF, $this->officeA, 'trashed-user')
            ->update(['is_deleted' => true]);

        $cards = $this->cards($this->asRole(Role::SUPER_ADMIN)->getJson('/api/dashboard')->assertOk());

        $this->assertSame(1, $cards['total_event_bookings']);
        $this->assertSame(1, $cards['approved_bookings']);
        $this->assertSame(
            User::query()->where('is_deleted', false)->count(),
            $cards['total_users'],
        );
        $this->assertSame(
            User::query()->where('is_deleted', false)->where('account_status', 'Active')->count(),
            $cards['active_users'],
        );
        $this->assertSame($cards['total_users'] - 1, $cards['active_users']);
    }

    public function test_cancelled_bookings_are_not_counted_as_approved(): void
    {
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'status' => 'cancelled',
        ]);
        $this->makeVehicleBooking($this->users[Role::FACULTY_STAFF], [
            'status' => 'cancelled',
        ]);
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'status' => 'approved',
        ]);

        $cards = $this->cards($this->asRole(Role::SUPER_ADMIN)->getJson('/api/dashboard')->assertOk());

        $this->assertSame(1, $cards['approved_bookings']);
        $this->assertSame(0, $cards['rejected_bookings']);
        $this->assertSame(2, $cards['total_event_bookings']);
    }

    public function test_client_supplied_role_does_not_change_dashboard(): void
    {
        $response = $this->asRole(Role::STUDENT_REPUBLIC)
            ->getJson('/api/dashboard?role=super-admin&role_id=1&user_id=1')
            ->assertOk();

        $this->assertSame(Role::STUDENT_REPUBLIC, $response->json('data.role'));
        $this->assertFalse($response->json('data.capabilities.vehicles'));
    }

    /**
     * @return array<string, int>
     */
    private function cards($response): array
    {
        $cards = [];

        foreach ($response->json('data.cards') as $card) {
            $cards[$card['key']] = (int) $card['value'];
        }

        return $cards;
    }

    private function asRole(string $slug)
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        return $this->actingAs($this->users[$slug], 'web');
    }

    private function userFor(string $slug, ?Office $office = null, ?string $key = null): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();
        $office ??= $this->officeA;
        $suffix = $key ?? $slug.'-'.uniqid();

        return User::create([
            'first_name' => 'Dash',
            'last_name' => $slug,
            'email' => $suffix.'@example.com',
            'username' => $suffix,
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load(['role', 'office']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeEventBooking(User $owner, array $overrides = []): EventBooking
    {
        return EventBooking::create(array_merge([
            'venue_id' => $this->venue->venue_id,
            'purpose' => 'Dashboard event',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '08:00:00',
            'time_end' => '10:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 10,
            'requested_by' => $owner->first_name.' '.$owner->last_name,
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ], $overrides));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeVehicleBooking(User $owner, array $overrides = []): VehicleBooking
    {
        return VehicleBooking::create(array_merge([
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'requested_by' => $owner->first_name.' '.$owner->last_name,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'destination' => 'City Hall',
            'purpose' => 'Dashboard trip',
            'travel_date' => now()->toDateString(),
            'departure_time' => '09:00:00',
            'expected_return_date' => now()->toDateString(),
            'expected_return_time' => '12:00:00',
            'passenger_count' => 4,
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ], $overrides));
    }
}
