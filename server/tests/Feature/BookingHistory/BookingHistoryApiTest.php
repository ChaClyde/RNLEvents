<?php

namespace Tests\Feature\BookingHistory;

use App\Models\EventBooking;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\VehicleBooking;
use App\Models\Venue;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BookingHistoryApiTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $faculty;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $office = Office::create([
            'office_code' => 'BH-A',
            'office_name' => 'History Office',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $venue = Venue::create([
            'venue' => 'History Hall',
            'capacity' => 20,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->superAdmin = $this->userFor(Role::SUPER_ADMIN, $office);
        $this->faculty = $this->userFor(Role::FACULTY_STAFF, $office);

        foreach (['approved', 'rejected', 'pending', 'cancelled'] as $status) {
            EventBooking::create([
                'venue_id' => $venue->venue_id,
                'purpose' => 'Event '.$status,
                'date_start' => now()->toDateString(),
                'date_end' => now()->toDateString(),
                'time_start' => '08:00:00',
                'time_end' => '10:00:00',
                'number_of_days' => 1,
                'expected_attendees' => 10,
                'requested_by' => 'History Requester',
                'requested_by_user_id' => $this->faculty->user_id,
                'office_id' => $office->office_id,
                'email' => $this->faculty->email,
                'tel_number' => '1234567',
                'status' => $status,
                'approval_stage' => ApprovalStage::OFFICE_HEAD,
                'is_deleted' => false,
            ]);

            VehicleBooking::create([
                'requested_by_user_id' => $this->faculty->user_id,
                'office_id' => $office->office_id,
                'requested_by' => 'History Requester',
                'email' => $this->faculty->email,
                'tel_number' => '1234567',
                'destination' => 'History destination',
                'purpose' => 'Trip '.$status,
                'travel_date' => now()->toDateString(),
                'departure_time' => '08:00',
                'expected_return_date' => now()->toDateString(),
                'expected_return_time' => '17:00',
                'passenger_count' => 2,
                'status' => $status,
                'approval_stage' => ApprovalStage::OFFICE_HEAD,
                'is_deleted' => false,
            ]);
        }
    }

    public function test_history_lists_only_approved_and_rejected_bookings(): void
    {
        $events = $this->actingAs($this->superAdmin, 'web')
            ->getJson('/api/booking-history?module=events')
            ->assertOk();

        $purposes = collect($events->json('data'))->pluck('purpose')->all();
        $this->assertEqualsCanonicalizing(['Event approved', 'Event rejected'], $purposes);
        $this->assertSame(1, $events->json('summary.events_approved'));
        $this->assertSame(1, $events->json('summary.events_rejected'));

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $vehicles = $this->actingAs($this->superAdmin, 'web')
            ->getJson('/api/booking-history?module=vehicles&status=approved')
            ->assertOk();

        $this->assertSame(['Trip approved'], collect($vehicles->json('data'))->pluck('purpose')->all());
    }

    public function test_pending_status_is_not_a_history_filter(): void
    {
        $this->actingAs($this->superAdmin, 'web')
            ->getJson('/api/booking-history?status=pending')
            ->assertStatus(422);
    }

    public function test_roles_without_history_access_are_denied(): void
    {
        $this->actingAs($this->faculty, 'web')
            ->getJson('/api/booking-history')
            ->assertForbidden();
    }

    private function userFor(string $slug, Office $office): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();

        return User::create([
            'first_name' => 'History',
            'last_name' => $slug,
            'email' => $slug.'-history@example.com',
            'username' => $slug.'-history',
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }
}
