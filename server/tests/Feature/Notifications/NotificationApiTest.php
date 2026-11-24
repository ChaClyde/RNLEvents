<?php

namespace Tests\Feature\Notifications;

use App\Models\EventBooking;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Notifications\SystemNotifier;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_new_booking_notifies_only_that_offices_head(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $officeA = $this->office('NA', 'Notify A');
        $officeB = $this->office('NB', 'Notify B');
        $faculty = $this->userFor(Role::FACULTY_STAFF, $officeA, 'faculty-note');
        $deanA = $this->userFor(Role::DEAN_OFFICE_HEAD, $officeA, 'dean-a-note');
        $deanB = $this->userFor(Role::DEAN_OFFICE_HEAD, $officeB, 'dean-b-note');

        $venue = Venue::create([
            'venue' => 'Notify Hall',
            'capacity' => 20,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $booking = EventBooking::create([
            'venue_id' => $venue->venue_id,
            'purpose' => 'Chapel rehearsal',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '08:00:00',
            'time_end' => '10:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 10,
            'requested_by' => 'Faculty Note',
            'requested_by_user_id' => $faculty->user_id,
            'office_id' => $officeA->office_id,
            'email' => $faculty->email,
            'tel_number' => '1234567',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ]);

        app(SystemNotifier::class)->bookingSubmitted($booking, $faculty);

        $noticeId = $this->actingAs($deanA, 'web')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('data.0.title', 'New event booking')
            ->json('data.0.notification_id');

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $this->actingAs($deanB, 'web')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 0);

        $this->actingAs($deanB, 'web')
            ->postJson('/api/notifications/'.$noticeId.'/read')
            ->assertNotFound();

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $this->actingAs($deanA, 'web')
            ->postJson('/api/notifications/'.$noticeId.'/read')
            ->assertOk();

        $this->actingAs($deanA, 'web')
            ->getJson('/api/notifications')
            ->assertJsonPath('unread_count', 0);
    }

    public function test_final_approval_notifies_the_requester(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $office = $this->office('NC', 'Notify C');
        $faculty = $this->userFor(Role::FACULTY_STAFF, $office, 'faculty-final');
        $president = $this->userFor(Role::SUPER_ADMIN, $office, 'president-note');

        $venue = Venue::create([
            'venue' => 'Final Hall',
            'capacity' => 20,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $booking = EventBooking::create([
            'venue_id' => $venue->venue_id,
            'purpose' => 'Final notice',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '08:00:00',
            'time_end' => '10:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 5,
            'requested_by' => 'Faculty Final',
            'requested_by_user_id' => $faculty->user_id,
            'office_id' => $office->office_id,
            'email' => $faculty->email,
            'tel_number' => '1234567',
            'status' => 'approved',
            'approval_stage' => ApprovalStage::SUPER_ADMIN,
            'is_deleted' => false,
        ]);

        app(SystemNotifier::class)->bookingDecided($booking, $president);

        $this->actingAs($faculty, 'web')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Event booking approved');
    }

    private function office(string $code, string $name): Office
    {
        return Office::create([
            'office_code' => $code,
            'office_name' => $name,
            'status' => 'active',
            'is_deleted' => false,
        ]);
    }

    private function userFor(string $slug, Office $office, string $key): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();

        return User::create([
            'first_name' => 'Note',
            'last_name' => $key,
            'email' => $key.'@example.com',
            'username' => $key,
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }
}
