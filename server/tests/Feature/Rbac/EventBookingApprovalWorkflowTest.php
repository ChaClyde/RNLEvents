<?php

namespace Tests\Feature\Rbac;

use App\Models\EventBooking;
use App\Models\EventBookingApproval;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class EventBookingApprovalWorkflowTest extends TestCase
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
            'office_code' => 'WF-A',
            'office_name' => 'Workflow Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->officeB = Office::create([
            'office_code' => 'WF-B',
            'office_name' => 'Workflow Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->venue = Venue::create([
            'venue' => 'Workflow Hall',
            'capacity' => 60,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        $this->users['faculty-b'] = $this->userFor(Role::FACULTY_STAFF, $this->officeB, 'faculty-b');
        $this->users['dean-b'] = $this->userFor(Role::DEAN_OFFICE_HEAD, $this->officeB, 'dean-b');
    }

    #[DataProvider('unauthorizedApproversProvider')]
    public function test_unauthorized_roles_cannot_approve_at_office_head(string $slug): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole($slug)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
                'approval_stage' => ApprovalStage::SUPER_ADMIN,
                'approved_by_user_id' => $this->users[Role::SUPER_ADMIN]->user_id,
            ])
            ->assertForbidden();

        $this->assertSame('pending', $booking->fresh()->status);
        $this->assertSame(ApprovalStage::OFFICE_HEAD, $booking->fresh()->approval_stage);
    }

    public static function unauthorizedApproversProvider(): array
    {
        return [
            'super-admin' => [Role::SUPER_ADMIN],
            'event-admin' => [Role::EVENT_ADMIN],
            'vehicle-admin' => [Role::VEHICLE_ADMIN],
            'event-approval-admin' => [Role::EVENT_APPROVAL_ADMIN],
            'vehicle-approval-admin' => [Role::VEHICLE_APPROVAL_ADMIN],
            'faculty-staff' => [Role::FACULTY_STAFF],
            'student-republic' => [Role::STUDENT_REPUBLIC],
        ];
    }

    public function test_sequential_approval_reaches_approved_only_after_all_stages(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
                'approval_stage' => ApprovalStage::SUPER_ADMIN,
                'approved_by' => $this->users[Role::SUPER_ADMIN]->user_id,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.approval_stage', ApprovalStage::EVENT_APPROVAL);

        $this->asRole(Role::EVENT_APPROVAL_ADMIN)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.approval_stage', ApprovalStage::EVENT_ADMIN);

        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.approval_stage', ApprovalStage::SUPER_ADMIN);

        $this->asRole(Role::SUPER_ADMIN)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
                'approval_remarks' => 'Final review complete',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.approval_stage', ApprovalStage::SUPER_ADMIN);

        $history = $booking->fresh()->approvals;
        $this->assertCount(4, $history);
        $this->assertEquals(
            [
                ApprovalStage::OFFICE_HEAD,
                ApprovalStage::EVENT_APPROVAL,
                ApprovalStage::EVENT_ADMIN,
                ApprovalStage::SUPER_ADMIN,
            ],
            $history->pluck('approval_stage')->all(),
        );
        $this->assertTrue($history->every(
            fn (EventBookingApproval $row) => $row->action === EventBookingApproval::ACTION_APPROVED
        ));
        $this->assertSame(
            $this->users[Role::SUPER_ADMIN]->user_id,
            $history->last()->approver_user_id,
        );
    }

    public function test_stage_skipping_and_duplicate_approvals_are_rejected(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole(Role::EVENT_APPROVAL_ADMIN)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk();

        $booking->refresh()->update(['approval_stage' => ApprovalStage::OFFICE_HEAD]);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertStatus(422);

        $booking->update(['approval_stage' => ApprovalStage::EVENT_APPROVAL]);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $this->asRole(Role::SUPER_ADMIN)
            ->withHeaders(['X-Emergency-Bypass' => '1'])
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
                'emergency_bypass' => true,
            ])
            ->assertForbidden();

        $this->assertSame(ApprovalStage::EVENT_APPROVAL, $booking->fresh()->approval_stage);
        $this->assertSame('pending', $booking->fresh()->status);
        $this->assertCount(1, $booking->fresh()->approvals);
    }

    public function test_dean_cannot_approve_another_office_booking(): void
    {
        $foreign = $this->makeBooking($this->users['faculty-b']);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/' . $foreign->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $this->actingAs($this->users['dean-b'], 'web')
            ->putJson('/api/event-bookings/updateStatus/' . $foreign->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('data.approval_stage', ApprovalStage::EVENT_APPROVAL);
    }

    public function test_rejection_at_each_stage_records_history_and_stops_the_pipeline(): void
    {
        foreach (ApprovalStage::eventPipeline() as $index => $stage) {
            $booking = $this->makeBooking(
                $this->users[Role::FACULTY_STAFF],
                sprintf('%02d:00:00', 8 + $index),
                sprintf('%02d:30:00', 8 + $index),
            );

            $this->advanceToStage($booking, $stage);

            $actor = match ($stage) {
                ApprovalStage::OFFICE_HEAD => Role::DEAN_OFFICE_HEAD,
                ApprovalStage::EVENT_APPROVAL => Role::EVENT_APPROVAL_ADMIN,
                ApprovalStage::EVENT_ADMIN => Role::EVENT_ADMIN,
                default => Role::SUPER_ADMIN,
            };

            $this->asRole($actor)
                ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                    'status' => 'rejected',
                    'approval_remarks' => 'Needs revision at ' . $stage,
                    'approver_user_id' => $this->users[Role::SUPER_ADMIN]->user_id,
                ])
                ->assertOk()
                ->assertJsonPath('data.status', 'rejected')
                ->assertJsonPath('data.approval_stage', $stage);

            $this->asRole(Role::SUPER_ADMIN)
                ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                    'status' => 'approved',
                ])
                ->assertStatus(422);

            $this->assertSame(
                EventBookingApproval::ACTION_REJECTED,
                $booking->fresh()->approvals->last()->action,
            );
            $this->assertSame(
                $this->users[$actor]->user_id,
                $booking->fresh()->approvals->last()->approver_user_id,
            );
        }
    }

    public function test_requester_can_cancel_own_pending_booking_and_cannot_cancel_another(): void
    {
        $own = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $other = $this->makeBooking($this->users[Role::STUDENT_REPUBLIC], '14:00', '15:00');

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/event-bookings/updateStatus/' . $own->event_booking_id, [
                'status' => 'cancelled',
                'cancellation_reason' => 'Schedule conflict',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/event-bookings/updateStatus/' . $other->event_booking_id, [
                'status' => 'cancelled',
                'cancellation_reason' => 'Not mine',
            ])
            ->assertForbidden();
    }

    public function test_student_republic_can_submit_but_cannot_approve(): void
    {
        $created = $this->asRole(Role::STUDENT_REPUBLIC)
            ->postJson('/api/event-bookings/storeEventBooking', [
                'venue_id' => $this->venue->venue_id,
                'purpose' => 'Student assembly',
                'date_start' => now()->toDateString(),
                'date_end' => now()->toDateString(),
                'time_start' => '16:00',
                'time_end' => '17:00',
                'expected_attendees' => 20,
                'requested_by' => 'Student Republic',
                'office_id' => $this->officeA->office_id,
                'email' => $this->users[Role::STUDENT_REPUBLIC]->email,
                'tel_number' => '5550000',
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame('pending', $created['status']);
        $this->assertSame(ApprovalStage::OFFICE_HEAD, $created['approval_stage']);

        $this->asRole(Role::STUDENT_REPUBLIC)
            ->putJson('/api/event-bookings/updateStatus/' . $created['event_booking_id'], [
                'status' => 'approved',
            ])
            ->assertForbidden();
    }

    public function test_unreviewed_bookings_can_be_edited_but_in_pipeline_bookings_cannot(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $payload = [
            'venue_id' => $this->venue->venue_id,
            'purpose' => 'Updated purpose',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '09:00',
            'time_end' => '10:00',
            'expected_attendees' => 12,
            'requested_by' => 'Faculty User',
            'office_id' => $this->officeA->office_id,
            'email' => $this->users[Role::FACULTY_STAFF]->email,
            'tel_number' => '1234567',
        ];

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/event-bookings/updateEventBooking/' . $booking->event_booking_id, $payload)
            ->assertOk();

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk();

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/event-bookings/updateEventBooking/' . $booking->event_booking_id, $payload)
            ->assertStatus(422);
    }

    private function advanceToStage(EventBooking $booking, string $target): void
    {
        $sequence = [
            ApprovalStage::OFFICE_HEAD => Role::DEAN_OFFICE_HEAD,
            ApprovalStage::EVENT_APPROVAL => Role::EVENT_APPROVAL_ADMIN,
            ApprovalStage::EVENT_ADMIN => Role::EVENT_ADMIN,
            ApprovalStage::SUPER_ADMIN => Role::SUPER_ADMIN,
        ];

        foreach ($sequence as $stage => $role) {
            if ($booking->fresh()->approval_stage === $target) {
                return;
            }

            $this->asRole($role)
                ->putJson('/api/event-bookings/updateStatus/' . $booking->event_booking_id, [
                    'status' => 'approved',
                ])
                ->assertOk();
        }
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
        $suffix = $key ?? $slug . '-' . uniqid();

        return User::create([
            'first_name' => 'Flow',
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

    private function makeBooking(User $owner, string $start = '09:00:00', string $end = '10:00:00'): EventBooking
    {
        return EventBooking::create([
            'venue_id' => $this->venue->venue_id,
            'purpose' => 'Workflow booking',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => $start,
            'time_end' => $end,
            'number_of_days' => 1,
            'expected_attendees' => 10,
            'requested_by' => $owner->first_name . ' ' . $owner->last_name,
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ]);
    }
}
