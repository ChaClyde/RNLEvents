<?php

namespace Tests\Feature\Rbac;

use App\Models\EventBooking;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Signatures\SignatureStorage;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\Support\ProvidesUserSignature;
use Tests\TestCase;

class GymUsagePolicyTest extends TestCase
{
    use ProvidesUserSignature;
    use RefreshDatabase;

    private Office $office;

    private Venue $gym;

    private Venue $hall;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->office = Office::create([
            'office_code' => 'GYM-A',
            'office_name' => 'Gym Office',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->gym = Venue::create([
            'venue' => 'FCU Gym',
            'capacity' => 200,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->hall = Venue::create([
            'venue' => 'Roblee Hall',
            'capacity' => 80,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        foreach ([Role::FACULTY_STAFF, Role::EVENT_ADMIN, Role::STUDENT_REPUBLIC] as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        Storage::fake(SignatureStorage::USER_DISK);
        Storage::fake(SignatureStorage::APPROVAL_DISK);
        $this->giveSignature($this->users[Role::FACULTY_STAFF]);
        $this->giveSignature($this->users[Role::STUDENT_REPUBLIC]);
    }

    public function test_permitted_gym_windows_are_accepted_and_other_times_are_rejected(): void
    {
        foreach ([
            [Carbon::MONDAY, '06:00', '08:00'],
            [Carbon::MONDAY, '16:00', '18:00'],
            [Carbon::TUESDAY, '06:30', '07:30'],
            [Carbon::THURSDAY, '16:00', '17:00'],
            [Carbon::FRIDAY, '06:00', '08:00'],
            [Carbon::WEDNESDAY, '06:00', '18:00'],
            [Carbon::SATURDAY, '09:00', '12:00'],
        ] as [$day, $start, $end]) {
            $this->asRole(Role::FACULTY_STAFF)
                ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $this->on($day), $start, $end))
                ->assertCreated();
        }

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $this->on(Carbon::MONDAY), '08:00', '09:00'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('time_start');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $this->on(Carbon::MONDAY), '06:00', '18:00'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('time_start');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $this->on(Carbon::WEDNESDAY), '18:00', '19:00'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('time_start');

        $sunday = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $this->on(Carbon::SUNDAY), '06:00', '08:00'));

        $sunday->assertStatus(422);
        $this->assertStringContainsString('Sunday', $sunday->json('errors.time_start.0'));
    }

    public function test_only_authorized_personnel_can_designate_a_university_wide_exception(): void
    {
        $outside = $this->payload($this->gym, $this->on(Carbon::MONDAY), '10:00', '12:00', [
            'university_wide_activity' => true,
            'purpose' => 'University assembly',
        ]);

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $outside)
            ->assertStatus(422)
            ->assertJsonValidationErrors('university_wide_activity');

        $this->asRole(Role::STUDENT_REPUBLIC)
            ->postJson('/api/event-bookings/storeEventBooking', $outside)
            ->assertStatus(422);

        $this->assertSame(0, EventBooking::count());

        $saved = $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/event-bookings/storeEventBooking', $outside)
            ->assertCreated();

        $saved->assertJsonPath('data.university_wide_activity', true);
        $saved->assertJsonPath(
            'data.university_wide_designated_by',
            $this->users[Role::EVENT_ADMIN]->user_id
        );
        $this->assertNotNull($saved->json('data.university_wide_designated_at'));

        $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->hall, $this->on(Carbon::MONDAY), '10:00', '12:00', [
                'university_wide_activity' => true,
                'purpose' => 'Hall exception',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('university_wide_activity');
    }

    public function test_overlapping_gym_bookings_are_rejected_and_other_venues_are_not_restricted(): void
    {
        $date = $this->on(Carbon::WEDNESDAY);

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $date, '08:00', '10:00', [
                'purpose' => 'Morning practice',
            ]))
            ->assertCreated();

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $date, '09:00', '11:00', [
                'purpose' => 'Overlapping practice',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('venue_id');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->hall, $this->on(Carbon::MONDAY), '10:00', '12:00', [
                'purpose' => 'Hall lecture',
                'gym_responsibilities_acknowledged' => false,
            ]))
            ->assertCreated()
            ->assertJsonPath('data.gym_responsibilities_acknowledged', false);
    }

    public function test_semester_and_summer_requests_warn_without_rejection_and_acknowledgment_is_stored(): void
    {
        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $this->on(Carbon::SATURDAY), '08:00', '10:00', [
                'gym_responsibilities_acknowledged' => false,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('gym_responsibilities_acknowledged');

        $semester = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $this->on(Carbon::SATURDAY), '08:00', '10:00', [
                'purpose' => 'Semester practice',
                'reservation_span' => 'whole_semester',
            ]))
            ->assertCreated();

        $semester->assertJsonPath('data.reservation_span', 'whole_semester');
        $this->assertStringContainsString(
            'strongly discouraged',
            (string) $semester->json('gym_reservation_warning')
        );
        $this->assertSame(
            'Maintain cleanliness. Protect facilities and equipment. Negligent damage will be charged to the responsible organization, department, or group.',
            $semester->json('data.gym_responsibility_statement')
        );

        $summer = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->payload($this->gym, $this->on(Carbon::WEDNESDAY), '13:00', '15:00', [
                'purpose' => 'Summer practice',
                'reservation_span' => 'whole_summer',
            ]))
            ->assertCreated();

        $this->assertStringContainsString('strongly discouraged', (string) $summer->json('gym_reservation_warning'));
        $this->assertSame('whole_summer', $summer->json('data.reservation_span'));
    }

    private function on(int $dayOfWeek): string
    {
        $date = now()->startOfDay()->addDays(2);

        if ($date->dayOfWeek !== $dayOfWeek) {
            $date = $date->next($dayOfWeek);
        }

        return $date->toDateString();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(Venue $venue, string $date, string $start, string $end, array $overrides = []): array
    {
        return array_merge([
            'venue_id' => $venue->venue_id,
            'purpose' => 'Gym use '.$date.' '.$start,
            'schedule_type' => 'range',
            'date_start' => $date,
            'date_end' => $date,
            'time_start' => $start,
            'time_end' => $end,
            'expected_attendees' => 20,
            'requested_by' => 'Requester',
            'office_id' => $this->office->office_id,
            'email' => 'requester@example.com',
            'tel_number' => '5550000',
            'gym_responsibilities_acknowledged' => true,
            'reservation_span' => 'standard',
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
            'first_name' => 'Gym',
            'last_name' => $slug,
            'email' => $slug.'@gym.example.com',
            'username' => $slug.'-gym',
            'password' => Hash::make('password'),
            'office_id' => $this->office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }
};
