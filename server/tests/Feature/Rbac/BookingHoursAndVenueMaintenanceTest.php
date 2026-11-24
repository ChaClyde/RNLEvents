<?php

namespace Tests\Feature\Rbac;

use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueMaintenance;
use App\Signatures\SignatureStorage;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\Support\ProvidesUserSignature;
use Tests\TestCase;

class BookingHoursAndVenueMaintenanceTest extends TestCase
{
    use ProvidesUserSignature;
    use RefreshDatabase;

    private Office $office;

    private Venue $hall;

    private Venue $gym;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->office = Office::create([
            'office_code' => 'HRS-A',
            'office_name' => 'Hours Office',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->hall = Venue::create([
            'venue' => 'Hours Hall',
            'capacity' => 40,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->gym = Venue::create([
            'venue' => 'FCU Gym',
            'capacity' => 200,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        foreach ([Role::FACULTY_STAFF, Role::EVENT_ADMIN] as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        Storage::fake(SignatureStorage::USER_DISK);
        Storage::fake(SignatureStorage::APPROVAL_DISK);
        $this->giveSignature($this->users[Role::FACULTY_STAFF]);
    }

    public function test_same_day_and_next_day_bookings_are_rejected(): void
    {
        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->hall, now()->toDateString(), '09:00', '10:00'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('date_start');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->hall, now()->addDay()->toDateString(), '09:00', '10:00'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('date_start');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->hall, now()->addDays(2)->toDateString(), '09:00', '10:00'))
            ->assertCreated();
    }

    public function test_event_bookings_must_stay_between_seven_and_ten(): void
    {
        $date = now()->addDays(3)->toDateString();

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->hall, $date, '06:30', '08:00'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('time_start');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->hall, $date, '21:00', '22:30'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('time_start');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->hall, $date, '07:00', '22:00'))
            ->assertCreated();
    }

    public function test_gym_keeps_its_six_am_window(): void
    {
        $date = now()->startOfDay()->addDays(2);

        if ($date->dayOfWeek !== Carbon::MONDAY) {
            $date = $date->next(Carbon::MONDAY);
        }

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $date->toDateString(), '06:00', '08:00', [
                'gym_responsibilities_acknowledged' => true,
            ]))
            ->assertCreated();
    }

    public function test_scheduled_maintenance_blocks_booking_and_is_returned_with_the_venue(): void
    {
        $date = now()->addDays(2)->toDateString();

        $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venue-maintenance/storeMaintenance', [
                'venue_id' => $this->hall->venue_id,
                'reason' => 'Floor repair',
                'notes' => 'Main hall closed',
                'date_start' => $date,
                'date_end' => $date,
            ])
            ->assertCreated();

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->hall, $date, '09:00', '11:00'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('venue_id');

        $loaded = $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/venues/loadVenues')
            ->assertOk()
            ->json('data');

        $hall = collect($loaded)->firstWhere('venue_id', $this->hall->venue_id);
        $this->assertSame('Floor repair', $hall['maintenance'][0]['reason']);

        $maintenance = VenueMaintenance::firstOrFail();
        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/venue-maintenance/updateStatus/'.$maintenance->maintenance_id, [
                'status' => 'completed',
            ])
            ->assertOk();

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->hall, $date, '09:00', '11:00'))
            ->assertCreated();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(Venue $venue, string $date, string $start, string $end, array $overrides = []): array
    {
        return array_merge([
            'venue_id' => $venue->venue_id,
            'purpose' => 'Hours check '.$date,
            'schedule_type' => 'range',
            'date_start' => $date,
            'date_end' => $date,
            'time_start' => $start,
            'time_end' => $end,
            'expected_attendees' => 10,
            'requested_by' => 'Requester',
            'office_id' => $this->office->office_id,
            'email' => 'requester@example.com',
            'tel_number' => '5550000',
        ], $overrides);
    }

    private function asRole(string $slug)
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        return $this->actingAs($this->users[$slug], 'web');
    }

    private function userFor(string $slug): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();

        return User::create([
            'first_name' => 'Hours',
            'last_name' => $slug,
            'email' => $slug.'@hours.example.com',
            'username' => $slug.'-hours',
            'password' => Hash::make('password'),
            'office_id' => $this->office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }
}
