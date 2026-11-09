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
use Tests\TestCase;

class ApiDataScopingTest extends TestCase
{
    use RefreshDatabase;

    private Office $officeA;
    private Office $officeB;
    private Venue $venue;
    private User $superAdmin;
    private User $dean;
    private User $facultyA;
    private User $facultyB;
    private User $studentA;
    private User $studentB;
    private User $eventAdmin;
    private User $eventApprover;

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

        $this->venue = Venue::create([
            'venue' => 'Scoped Hall',
            'capacity' => 80,
            'location' => 'Main Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->superAdmin = $this->userFor(Role::SUPER_ADMIN);
        $this->dean = $this->userFor(Role::DEAN_OFFICE_HEAD);
        $this->facultyA = $this->userFor(Role::FACULTY_STAFF);
        $this->facultyB = $this->userFor(Role::FACULTY_STAFF, $this->officeB);
        $this->studentA = $this->userFor(Role::STUDENT_REPUBLIC);
        $this->studentB = $this->userFor(Role::STUDENT_REPUBLIC, $this->officeB);
        $this->eventAdmin = $this->userFor(Role::EVENT_ADMIN);
        $this->eventApprover = $this->userFor(Role::EVENT_APPROVAL_ADMIN);
    }

    public function test_dean_user_list_is_limited_to_their_office(): void
    {
        $this->actingAsUser($this->dean)
            ->getJson('/api/users/loadUsers?office_id=' . $this->officeB->office_id)
            ->assertOk()
            ->assertJsonMissing(['user_id' => $this->facultyB->user_id])
            ->assertJsonFragment(['user_id' => $this->dean->user_id])
            ->assertJsonFragment(['user_id' => $this->facultyA->user_id]);
    }

    public function test_dean_cannot_access_another_office_user_by_id(): void
    {
        $this->actingAsUser($this->dean)
            ->getJson('/api/users/getUser/' . $this->facultyB->user_id)
            ->assertForbidden();
    }

    public function test_dean_cannot_create_or_transfer_users_into_another_office(): void
    {
        $facultyRole = Role::where('slug', Role::FACULTY_STAFF)->firstOrFail();

        $created = $this->actingAsUser($this->dean)
            ->postJson('/api/users/storeUser', [
                'first_name' => 'Office',
                'last_name' => 'Bound',
                'email' => 'office-bound@example.com',
                'username' => 'officebound',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role_id' => $facultyRole->role_id,
                'office_id' => $this->officeB->office_id,
            ])
            ->assertCreated()
            ->json('user');

        $this->assertSame($this->officeA->office_id, $created['office_id']);

        $this->actingAsUser($this->dean)
            ->putJson('/api/users/updateUser/' . $this->facultyA->user_id, [
                'first_name' => $this->facultyA->first_name,
                'last_name' => $this->facultyA->last_name,
                'email' => $this->facultyA->email,
                'username' => $this->facultyA->username,
                'role_id' => $this->facultyA->role_id,
                'office_id' => $this->officeB->office_id,
                'account_status' => 'Active',
            ])
            ->assertOk();

        $this->assertSame(
            $this->officeA->office_id,
            $this->facultyA->fresh()->office_id,
        );
    }

    public function test_faculty_and_student_booking_lists_are_owned_only(): void
    {
        $ownFaculty = $this->makeBooking($this->facultyA);
        $otherFaculty = $this->makeBooking($this->facultyB);
        $ownStudent = $this->makeBooking($this->studentA);
        $otherStudent = $this->makeBooking($this->studentB);

        $facultyList = $this->actingAsUser($this->facultyA)
            ->getJson('/api/event-bookings')
            ->assertOk()
            ->json('data');

        $this->assertEqualsCanonicalizing(
            [$ownFaculty->event_booking_id],
            collect($facultyList)->pluck('event_booking_id')->all(),
        );
        $this->assertNotContains($otherFaculty->event_booking_id, collect($facultyList)->pluck('event_booking_id'));

        $studentList = $this->actingAsUser($this->studentA)
            ->getJson('/api/event-bookings')
            ->assertOk()
            ->json('data');

        $this->assertEqualsCanonicalizing(
            [$ownStudent->event_booking_id],
            collect($studentList)->pluck('event_booking_id')->all(),
        );
        $this->assertNotContains($otherStudent->event_booking_id, collect($studentList)->pluck('event_booking_id'));
    }

    public function test_users_cannot_view_update_or_delete_another_users_booking(): void
    {
        $booking = $this->makeBooking($this->facultyA);

        $this->actingAsUser($this->facultyB)
            ->getJson('/api/event-bookings/' . $booking->event_booking_id)
            ->assertForbidden();

        $this->actingAsUser($this->studentA)
            ->getJson('/api/event-bookings/' . $booking->event_booking_id)
            ->assertForbidden();

        $this->actingAsUser($this->facultyB)
            ->putJson(
                '/api/event-bookings/updateEventBooking/' . $booking->event_booking_id,
                $this->bookingPayload($this->facultyB),
            )
            ->assertForbidden();

        $this->actingAsUser($this->facultyB)
            ->deleteJson('/api/event-bookings/destroyEventBooking/' . $booking->event_booking_id)
            ->assertForbidden();

        $this->assertFalse($booking->fresh()->is_deleted);
    }

    public function test_requester_id_cannot_be_spoofed_during_creation(): void
    {
        $response = $this->actingAsUser($this->facultyA)
            ->postJson('/api/event-bookings/storeEventBooking', array_merge(
                $this->bookingPayload($this->facultyB),
                [
                    'requested_by_user_id' => $this->facultyB->user_id,
                    'office_id' => $this->officeB->office_id,
                ],
            ))
            ->assertCreated()
            ->json('data');

        $this->assertSame($this->facultyA->user_id, $response['requested_by_user_id']);
        $this->assertSame($this->officeA->office_id, $response['office_id']);
    }

    public function test_approval_admins_can_access_assigned_office_and_pipeline_bookings(): void
    {
        $officeBooking = $this->makeBooking($this->facultyA);
        $otherOfficeBooking = $this->makeBooking($this->facultyB);

        $deanList = collect($this->actingAsUser($this->dean)
            ->getJson('/api/event-bookings')
            ->assertOk()
            ->json('data'))->pluck('event_booking_id');

        $this->assertContains($officeBooking->event_booking_id, $deanList);
        $this->assertNotContains($otherOfficeBooking->event_booking_id, $deanList);

        $this->actingAsUser($this->dean)
            ->getJson('/api/event-bookings/' . $officeBooking->event_booking_id)
            ->assertOk();

        $this->actingAsUser($this->dean)
            ->getJson('/api/event-bookings/' . $otherOfficeBooking->event_booking_id)
            ->assertForbidden();

        $approverList = collect($this->actingAsUser($this->eventApprover)
            ->getJson('/api/event-bookings')
            ->assertOk()
            ->json('data'))->pluck('event_booking_id');

        $this->assertContains($officeBooking->event_booking_id, $approverList);
        $this->assertContains($otherOfficeBooking->event_booking_id, $approverList);

        $this->actingAsUser($this->eventAdmin)
            ->getJson('/api/event-bookings/' . $otherOfficeBooking->event_booking_id)
            ->assertOk();
    }

    public function test_super_admin_retains_system_wide_user_and_booking_access(): void
    {
        $foreignBooking = $this->makeBooking($this->facultyB);

        $users = collect($this->actingAsUser($this->superAdmin)
            ->getJson('/api/users/loadUsers')
            ->assertOk()
            ->json('users'))->pluck('user_id');

        $this->assertContains($this->facultyA->user_id, $users);
        $this->assertContains($this->facultyB->user_id, $users);

        $bookings = collect($this->actingAsUser($this->superAdmin)
            ->getJson('/api/event-bookings')
            ->assertOk()
            ->json('data'))->pluck('event_booking_id');

        $this->assertContains($foreignBooking->event_booking_id, $bookings);

        $this->actingAsUser($this->superAdmin)
            ->getJson('/api/event-bookings/' . $foreignBooking->event_booking_id)
            ->assertOk();
    }

    private function actingAsUser(User $user)
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        return $this->actingAs($user, 'web');
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

    private function makeBooking(User $owner): EventBooking
    {
        return EventBooking::create([
            'venue_id' => $this->venue->venue_id,
            'purpose' => 'Scoped booking for ' . $owner->username,
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '10:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 10,
            'requested_by' => $owner->first_name . ' ' . $owner->last_name,
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'status' => 'pending',
            'approval_stage' => 'office_head',
            'is_deleted' => false,
        ]);
    }

    private function bookingPayload(User $actor): array
    {
        return [
            'venue_id' => $this->venue->venue_id,
            'purpose' => 'Faculty request',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '13:00',
            'time_end' => '14:00',
            'expected_attendees' => 5,
            'requested_by' => 'Spoofed Name',
            'office_id' => $actor->office_id,
            'email' => $actor->email,
            'tel_number' => '9999999',
        ];
    }
}
