<?php

namespace Tests\Feature\Rbac;

use App\Models\Driver;
use App\Models\EventBooking;
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

class BookingConflictAndCalendarTest extends TestCase
{
    use RefreshDatabase;

    private Office $officeA;
    private Venue $hallA;
    private Venue $hallB;
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
            'office_code' => 'CAL-A',
            'office_name' => 'Calendar Office',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->hallA = Venue::create([
            'venue' => 'Hall A',
            'capacity' => 80,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->hallB = Venue::create([
            'venue' => 'Hall B',
            'capacity' => 80,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->vanA = Vehicle::create([
            'vehicle_name' => 'Van A',
            'plate_number' => 'CAL-001',
            'capacity' => 12,
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->vanB = Vehicle::create([
            'vehicle_name' => 'Van B',
            'plate_number' => 'CAL-002',
            'capacity' => 12,
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->driverA = Driver::create([
            'driver_name' => 'Driver A',
            'driver_status' => 'Available',
            'is_deleted' => false,
        ]);

        $this->driverB = Driver::create([
            'driver_name' => 'Driver B',
            'driver_status' => 'Available',
            'is_deleted' => false,
        ]);

        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }
    }

    public function test_same_venue_overlap_is_rejected_and_different_venues_are_allowed(): void
    {
        $first = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->eventPayload([
                'venue_id' => $this->hallA->venue_id,
                'time_start' => '09:00',
                'time_end' => '11:00',
            ]))
            ->assertCreated()
            ->json('data');

        $conflict = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->eventPayload([
                'purpose' => 'Overlapping lecture',
                'venue_id' => $this->hallA->venue_id,
                'time_start' => '10:00',
                'time_end' => '12:00',
            ]))
            ->assertStatus(422);

        $conflict->assertJsonPath('available', false);
        $conflict->assertJsonPath('conflicts.0.status', 'pending');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->eventPayload([
                'purpose' => 'Other hall',
                'venue_id' => $this->hallB->venue_id,
                'time_start' => '10:00',
                'time_end' => '12:00',
            ]))
            ->assertCreated();

        $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/availability/venues?' . http_build_query([
                'venue_id' => $this->hallA->venue_id,
                'date_start' => now()->toDateString(),
                'date_end' => now()->toDateString(),
                'time_start' => '10:00',
                'time_end' => '12:00',
            ]))
            ->assertOk()
            ->assertJsonPath('available', false);

        $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/availability/venues?' . http_build_query([
                'venue_id' => $this->hallA->venue_id,
                'date_start' => now()->toDateString(),
                'date_end' => now()->toDateString(),
                'time_start' => '10:00',
                'time_end' => '12:00',
                'exclude_event_booking_id' => $first['event_booking_id'],
            ]))
            ->assertOk()
            ->assertJsonPath('available', true);
    }

    public function test_rejected_and_cancelled_bookings_do_not_block_the_venue(): void
    {
        $rejected = EventBooking::create($this->eventRecord([
            'status' => 'rejected',
            'time_start' => '09:00:00',
            'time_end' => '11:00:00',
        ]));

        $cancelled = EventBooking::create($this->eventRecord([
            'status' => 'cancelled',
            'time_start' => '09:00:00',
            'time_end' => '11:00:00',
            'purpose' => 'Cancelled slot',
        ]));

        $this->assertNotNull($rejected->event_booking_id);
        $this->assertNotNull($cancelled->event_booking_id);

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->eventPayload([
                'time_start' => '09:30',
                'time_end' => '10:30',
            ]))
            ->assertCreated();
    }

    public function test_updating_a_booking_does_not_conflict_with_itself(): void
    {
        $created = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->eventPayload())
            ->assertCreated()
            ->json('data');

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/event-bookings/updateEventBooking/' . $created['event_booking_id'], $this->eventPayload([
                'purpose' => 'Updated without moving',
            ]))
            ->assertOk();
    }

    public function test_multi_day_event_bookings_conflict_on_inner_days(): void
    {
        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->eventPayload([
                'date_start' => now()->toDateString(),
                'date_end' => now()->addDays(2)->toDateString(),
                'time_start' => '08:00',
                'time_end' => '17:00',
            ]))
            ->assertCreated();

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->eventPayload([
                'purpose' => 'Inner day',
                'date_start' => now()->addDay()->toDateString(),
                'date_end' => now()->addDay()->toDateString(),
                'time_start' => '10:00',
                'time_end' => '11:00',
            ]))
            ->assertStatus(422)
            ->assertJsonPath('available', false);
    }

    public function test_vehicle_and_driver_conflicts_and_leave_rules(): void
    {
        $first = $this->pendingVehicleAtAdmin();
        $second = $this->pendingVehicleAtAdmin('10:00', '12:00', 'Second trip');

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $first->vehicle_booking_id, [
                'vehicle_id' => $this->vanA->vehicle_id,
                'driver_id' => $this->driverA->driver_id,
            ])
            ->assertOk();

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $second->vehicle_booking_id, [
                'vehicle_id' => $this->vanA->vehicle_id,
                'driver_id' => $this->driverB->driver_id,
            ])
            ->assertStatus(422);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $second->vehicle_booking_id, [
                'vehicle_id' => $this->vanB->vehicle_id,
                'driver_id' => $this->driverA->driver_id,
            ])
            ->assertStatus(422);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $second->vehicle_booking_id, [
                'vehicle_id' => $this->vanB->vehicle_id,
                'driver_id' => $this->driverB->driver_id,
            ])
            ->assertOk();

        $onLeave = Driver::create([
            'driver_name' => 'Leave Driver',
            'driver_status' => 'On Leave',
            'status_remarks' => 'Emergency leave',
            'status_start_date' => now()->toDateString(),
            'status_end_date' => now()->addDay()->toDateString(),
            'is_deleted' => false,
        ]);

        $expired = Driver::create([
            'driver_name' => 'Expired License',
            'driver_status' => 'Available',
            'license_expiry' => now()->subDay()->toDateString(),
            'is_deleted' => false,
        ]);

        $third = $this->pendingVehicleAtAdmin('16:30', '17:30', 'Third trip');

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $third->vehicle_booking_id, [
                'vehicle_id' => $this->vanA->vehicle_id,
                'driver_id' => $onLeave->driver_id,
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.driver_id.0', 'This driver is unavailable (On Leave): Emergency leave.');

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $third->vehicle_booking_id, [
                'vehicle_id' => $this->vanA->vehicle_id,
                'driver_id' => $expired->driver_id,
            ])
            ->assertStatus(422);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->getJson('/api/availability/vehicles?' . http_build_query([
                'vehicle_id' => $this->vanA->vehicle_id,
                'travel_date' => now()->toDateString(),
                'expected_return_date' => now()->toDateString(),
                'departure_time' => '09:00',
                'expected_return_time' => '11:00',
            ]))
            ->assertOk()
            ->assertJsonPath('available', false);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->getJson('/api/availability/drivers?' . http_build_query([
                'driver_id' => $onLeave->driver_id,
                'travel_date' => now()->toDateString(),
                'expected_return_date' => now()->toDateString(),
                'departure_time' => '09:00',
                'expected_return_time' => '11:00',
            ]))
            ->assertOk()
            ->assertJsonPath('available', false)
            ->assertJsonPath('unavailability_reason', 'This driver is unavailable (On Leave): Emergency leave.');
    }

    public function test_calendar_is_scoped_and_rejects_unauthorized_roles(): void
    {
        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->eventPayload())
            ->assertCreated();

        $own = $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/calendar?' . http_build_query([
                'from' => now()->toDateString(),
                'to' => now()->toDateString(),
            ]))
            ->assertOk()
            ->json('data');

        $this->assertTrue(collect($own)->contains(
            fn (array $item) => $item['type'] === 'event_booking' && $item['title'] === 'Conflict lecture'
        ));

        $this->asRole(Role::VEHICLE_ADMIN)
            ->getJson('/api/calendar?' . http_build_query([
                'from' => now()->toDateString(),
                'to' => now()->toDateString(),
            ]))
            ->assertOk()
            ->assertJsonMissing(['title' => 'Conflict lecture']);

        $role = Role::create([
            'name' => 'No Calendar',
            'slug' => 'no-calendar',
            'status' => 'active',
            'is_system_role' => false,
            'is_deleted' => false,
        ]);

        $outsider = $this->userFor('no-calendar', role: $role);

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->actingAs($outsider, 'web')
            ->getJson('/api/calendar?' . http_build_query([
                'from' => now()->toDateString(),
                'to' => now()->toDateString(),
            ]))
            ->assertForbidden();
    }

    public function test_sequential_overlapping_requests_serialize_on_the_locked_venue(): void
    {
        $payload = $this->eventPayload(['purpose' => 'First reserved slot']);

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $payload)
            ->assertCreated();

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $payload)
            ->assertStatus(422)
            ->assertJsonPath('available', false);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function eventPayload(array $overrides = []): array
    {
        $faculty = $this->users[Role::FACULTY_STAFF];

        return array_merge([
            'venue_id' => $this->hallA->venue_id,
            'purpose' => 'Conflict lecture',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '09:00',
            'time_end' => '11:00',
            'expected_attendees' => 10,
            'requested_by' => $faculty->first_name . ' ' . $faculty->last_name,
            'office_id' => $this->officeA->office_id,
            'email' => $faculty->email,
            'tel_number' => '1234567',
        ], $overrides);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function eventRecord(array $overrides = []): array
    {
        $faculty = $this->users[Role::FACULTY_STAFF];

        return array_merge([
            'venue_id' => $this->hallA->venue_id,
            'purpose' => 'Blocked record',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '11:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 10,
            'requested_by' => $faculty->first_name . ' ' . $faculty->last_name,
            'requested_by_user_id' => $faculty->user_id,
            'office_id' => $this->officeA->office_id,
            'email' => $faculty->email,
            'tel_number' => '1234567',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ], $overrides);
    }

    private function pendingVehicleAtAdmin(string $start = '09:00', string $end = '11:00', string $purpose = 'Trip'): VehicleBooking
    {
        $owner = $this->users[Role::FACULTY_STAFF];

        return VehicleBooking::create([
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'requested_by' => $owner->first_name . ' ' . $owner->last_name,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'destination' => 'City Hall',
            'purpose' => $purpose,
            'travel_date' => now()->toDateString(),
            'departure_time' => $start,
            'expected_return_date' => now()->toDateString(),
            'expected_return_time' => $end,
            'passenger_count' => 4,
            'status' => 'pending',
            'approval_stage' => ApprovalStage::VEHICLE_ADMIN,
            'is_deleted' => false,
        ]);
    }

    private function asRole(string $slug)
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        return $this->actingAs($this->users[$slug], 'web');
    }

    private function userFor(string $slug, ?Office $office = null, ?Role $role = null): User
    {
        $role ??= Role::where('slug', $slug)->firstOrFail();
        $office ??= $this->officeA;
        $suffix = $slug . '-' . uniqid();

        return User::create([
            'first_name' => 'Cal',
            'last_name' => $slug,
            'email' => $suffix . '@example.com',
            'username' => $suffix,
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }
}
