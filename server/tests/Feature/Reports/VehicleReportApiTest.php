<?php

namespace Tests\Feature\Reports;

use App\Models\Driver;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class VehicleReportApiTest extends TestCase
{
    use RefreshDatabase;

    private Office $officeA;
    private Office $officeB;
    private Vehicle $vanA;
    private Vehicle $vanB;
    private Driver $driverA;
    private Driver $driverB;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->officeA = Office::create([
            'office_code' => 'VR-A',
            'office_name' => 'Vehicle Reports A',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->officeB = Office::create([
            'office_code' => 'VR-B',
            'office_name' => 'Vehicle Reports B',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->vanA = Vehicle::create([
            'vehicle_name' => 'Van Alpha',
            'plate_number' => 'VR-AAA',
            'capacity' => 12,
            'status' => 'available',
            'is_deleted' => false,
        ]);
        $this->vanB = Vehicle::create([
            'vehicle_name' => 'Van Beta',
            'plate_number' => 'VR-BBB',
            'capacity' => 8,
            'status' => 'maintenance',
            'is_deleted' => false,
        ]);
        $this->driverA = Driver::create([
            'driver_name' => 'Driver Alpha',
            'driver_status' => 'Available',
            'license_expiry' => now()->addMonths(8)->toDateString(),
            'is_deleted' => false,
        ]);
        $this->driverB = Driver::create([
            'driver_name' => 'Driver Beta',
            'driver_status' => 'On Leave',
            'status_remarks' => 'Medical leave',
            'status_start_date' => now()->toDateString(),
            'status_end_date' => now()->addDays(5)->toDateString(),
            'license_expiry' => now()->subDays(2)->toDateString(),
            'is_deleted' => false,
        ]);

        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        $this->users['faculty-b'] = $this->userFor(Role::FACULTY_STAFF, $this->officeB, 'faculty-b');
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/reports/vehicles/summary')->assertUnauthorized();
        $this->getJson('/api/reports/vehicles/bookings')->assertUnauthorized();
    }

    public function test_super_admin_sees_system_wide_reports(): void
    {
        $this->seedBookings();

        $cards = $this->cards(
            $this->asRole(Role::SUPER_ADMIN)->getJson('/api/reports/vehicles/summary')->assertOk()
        );

        $this->assertSame(6, $cards['total']);
        $this->assertSame(1, $cards['pending']);
        $this->assertSame(3, $cards['approved']);
        $this->assertSame(1, $cards['rejected']);
        $this->assertSame(1, $cards['cancelled']);
        $this->assertSame(1, $cards['completed']);
        $this->assertSame(2, $cards['upcoming']);

        $offices = $this->asRole(Role::SUPER_ADMIN)
            ->getJson('/api/reports/vehicles/offices')
            ->assertOk()
            ->json('data');

        $this->assertCount(2, $offices);
    }

    public function test_vehicle_admin_can_access_vehicle_and_driver_reports(): void
    {
        $this->seedBookings();

        $this->asRole(Role::VEHICLE_ADMIN)
            ->getJson('/api/reports/vehicles/summary')
            ->assertOk()
            ->assertJsonPath('data.cards.0.value', 6);

        $utilization = $this->asRole(Role::VEHICLE_ADMIN)
            ->getJson('/api/reports/vehicles/utilization')
            ->assertOk()
            ->json('data');

        $this->assertTrue($utilization['can_view_fleet']);
        $this->assertSame(1, $utilization['fleet']['available']);
        $this->assertSame(1, $utilization['fleet']['maintenance']);
        $this->assertSame('Van Alpha', $utilization['most_frequent'][0]['label']);
        $this->assertSame(4, $utilization['most_frequent'][0]['value']);

        $drivers = $this->asRole(Role::VEHICLE_ADMIN)
            ->getJson('/api/reports/vehicles/drivers')
            ->assertOk()
            ->json('data');

        $this->assertTrue($drivers['can_view_drivers']);
        $this->assertSame(1, $this->cardValue($drivers['cards'], 'on_leave'));
        $this->assertSame('Medical leave', $drivers['leave'][0]['status_remarks']);
        $this->assertTrue($drivers['licenses'][0]['expired']);
        $this->assertSame('Driver Alpha', $drivers['assignments'][0]['label']);
        $this->assertSame(3, $drivers['assignments'][0]['value']);
    }

    public function test_vehicle_approval_admin_can_access_limited_vehicle_reports(): void
    {
        $this->seedBookings();

        $this->asRole(Role::VEHICLE_APPROVAL_ADMIN)
            ->getJson('/api/reports/vehicles/summary')
            ->assertOk()
            ->assertJsonPath('data.limited', true)
            ->assertJsonPath('data.cards.0.value', 6);
    }

    public function test_dean_only_sees_own_office_reports(): void
    {
        $this->seedBookings();

        $cards = $this->cards(
            $this->asRole(Role::DEAN_OFFICE_HEAD)
                ->getJson('/api/reports/vehicles/summary?office_id='.$this->officeB->office_id)
                ->assertOk()
        );

        $this->assertSame(4, $cards['total']);
        $this->assertSame(1, $cards['pending']);
        $this->assertSame(2, $cards['approved']);

        $bookings = $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->getJson('/api/reports/vehicles/bookings')
            ->assertOk()
            ->json('data');

        $purposes = collect($bookings)->pluck('purpose')->all();
        $this->assertContains('Alpha pending', $purposes);
        $this->assertNotContains('Bravo approved', $purposes);
        $this->assertStringNotContainsString('@example.com', (string) json_encode($bookings));
        $this->assertStringNotContainsString('passenger_details', (string) json_encode($bookings));
    }

    public function test_unauthorized_roles_cannot_access_vehicle_reports(): void
    {
        foreach ([
            Role::EVENT_ADMIN,
            Role::EVENT_APPROVAL_ADMIN,
            Role::FACULTY_STAFF,
            Role::STUDENT_REPUBLIC,
        ] as $slug) {
            $this->asRole($slug)
                ->getJson('/api/reports/vehicles/summary')
                ->assertForbidden();
        }
    }

    public function test_date_and_combined_filters(): void
    {
        $this->seedBookings();

        $cards = $this->cards(
            $this->asRole(Role::SUPER_ADMIN)
                ->getJson('/api/reports/vehicles/summary?start_date='.now()->toDateString().'&end_date='.now()->toDateString().'&status=approved&vehicle_id='.$this->vanA->vehicle_id)
                ->assertOk()
        );

        $this->assertSame(1, $cards['total']);
        $this->assertSame(1, $cards['approved']);

        $search = $this->asRole(Role::SUPER_ADMIN)
            ->getJson('/api/reports/vehicles/bookings?search=Bravo&destination=City')
            ->assertOk()
            ->json('data');

        $this->assertCount(2, $search);
    }

    public function test_multiday_trip_is_included_when_range_overlaps(): void
    {
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Multiday trip',
            'status' => 'approved',
            'travel_date' => now()->subDay()->toDateString(),
            'expected_return_date' => now()->addDay()->toDateString(),
        ]);

        $cards = $this->cards(
            $this->asRole(Role::VEHICLE_ADMIN)
                ->getJson('/api/reports/vehicles/summary?start_date='.now()->toDateString().'&end_date='.now()->toDateString())
                ->assertOk()
        );

        $this->assertSame(1, $cards['total']);
        $this->assertSame(1, $cards['approved']);
    }

    public function test_soft_deleted_bookings_are_excluded(): void
    {
        $this->seedBookings();
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Trashed',
            'status' => 'approved',
            'is_deleted' => true,
        ]);

        $cards = $this->cards(
            $this->asRole(Role::SUPER_ADMIN)->getJson('/api/reports/vehicles/summary')->assertOk()
        );

        $this->assertSame(6, $cards['total']);
        $this->assertSame(3, $cards['approved']);
    }

    public function test_cancelled_bookings_are_not_counted_as_approved(): void
    {
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'status' => 'cancelled',
        ]);

        $cards = $this->cards(
            $this->asRole(Role::SUPER_ADMIN)->getJson('/api/reports/vehicles/summary')->assertOk()
        );

        $this->assertSame(0, $cards['approved']);
        $this->assertSame(1, $cards['cancelled']);
    }

    public function test_pagination_and_sorting(): void
    {
        $this->makeBooking($this->users[Role::FACULTY_STAFF], ['purpose' => 'Zebra']);
        $this->makeBooking($this->users[Role::FACULTY_STAFF], ['purpose' => 'Alpha']);

        $page = $this->asRole(Role::SUPER_ADMIN)
            ->getJson('/api/reports/vehicles/bookings?sort=purpose&direction=asc&per_page=1&page=1')
            ->assertOk();

        $this->assertSame('Alpha', $page->json('data.0.purpose'));
        $this->assertSame(2, $page->json('meta.total'));
        $this->assertSame(2, $page->json('meta.last_page'));
    }

    public function test_client_user_id_does_not_expand_access(): void
    {
        $this->seedBookings();

        $cards = $this->cards(
            $this->asRole(Role::DEAN_OFFICE_HEAD)
                ->getJson('/api/reports/vehicles/summary?user_id='.$this->users['faculty-b']->user_id)
                ->assertOk()
        );

        $this->assertSame(4, $cards['total']);
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

    /**
     * @param  list<array{key: string, value: mixed}>  $cards
     */
    private function cardValue(array $cards, string $key): int
    {
        foreach ($cards as $card) {
            if ($card['key'] === $key) {
                return (int) $card['value'];
            }
        }

        return 0;
    }

    private function seedBookings(): void
    {
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha pending',
            'status' => 'pending',
            'vehicle_id' => $this->vanA->vehicle_id,
            'driver_id' => $this->driverA->driver_id,
        ]);
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha approved today',
            'status' => 'approved',
            'vehicle_id' => $this->vanA->vehicle_id,
            'driver_id' => $this->driverA->driver_id,
        ]);
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha completed',
            'status' => 'approved',
            'vehicle_id' => $this->vanA->vehicle_id,
            'driver_id' => $this->driverA->driver_id,
            'travel_date' => now()->subDays(10)->toDateString(),
            'expected_return_date' => now()->subDays(8)->toDateString(),
        ]);
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha cancelled',
            'status' => 'cancelled',
            'vehicle_id' => $this->vanA->vehicle_id,
        ]);
        $this->makeBooking($this->users['faculty-b'], [
            'purpose' => 'Bravo approved',
            'status' => 'approved',
            'vehicle_id' => $this->vanB->vehicle_id,
            'destination' => 'City Hall',
        ]);
        $this->makeBooking($this->users['faculty-b'], [
            'purpose' => 'Bravo rejected',
            'status' => 'rejected',
            'vehicle_id' => $this->vanB->vehicle_id,
            'destination' => 'City Plaza',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeBooking(User $owner, array $overrides = []): VehicleBooking
    {
        return VehicleBooking::create(array_merge([
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'requested_by' => $owner->first_name.' '.$owner->last_name,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'destination' => 'Campus Gate',
            'purpose' => 'Report trip',
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
}
