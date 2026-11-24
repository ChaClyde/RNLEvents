<?php

namespace Tests\Feature\Rbac;

use App\EventBookings\EventBookingSlip;
use App\Models\EventBooking;
use App\Models\EventBookingApproval;
use App\Models\EventBookingResource;
use App\Models\EventBookingSchedule;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EventBookingSlipTest extends TestCase
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
            'office_code' => 'SL-A',
            'office_name' => 'Slip Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->officeB = Office::create([
            'office_code' => 'SL-B',
            'office_name' => 'Slip Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->venue = Venue::create([
            'venue' => 'University Chapel',
            'capacity' => 120,
            'location' => 'Main Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        foreach ([Role::FACULTY_STAFF, Role::STUDENT_REPUBLIC, Role::DEAN_OFFICE_HEAD, Role::EVENT_ADMIN, Role::VEHICLE_ADMIN] as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        $this->users['faculty-b'] = $this->userFor(Role::FACULTY_STAFF, $this->officeB, 'faculty-b');
    }

    public function test_owner_can_preview_and_download_a_slip_with_recorded_details(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        EventBookingSchedule::create([
            'event_booking_id' => $booking->event_booking_id,
            'venue_id' => $this->venue->venue_id,
            'schedule_date' => now()->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '11:00:00',
        ]);
        EventBookingResource::create([
            'event_booking_id' => $booking->event_booking_id,
            'resource_name' => 'Sound system',
            'quantity' => 2,
            'notes' => 'With microphones',
        ]);
        EventBookingApproval::create([
            'event_booking_id' => $booking->event_booking_id,
            'approver_user_id' => $this->users[Role::DEAN_OFFICE_HEAD]->user_id,
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'action' => EventBookingApproval::ACTION_APPROVED,
            'remarks' => 'Endorsed for the chapel',
        ]);
        $booking->update([
            'status' => 'pending',
            'approval_stage' => ApprovalStage::EVENT_ADMIN,
            'approval_remarks' => 'Endorsed for the chapel',
        ]);

        $html = view('event-bookings.slip', [
            'slip' => EventBookingSlip::data($booking->fresh()),
        ])->render();

        $this->assertStringContainsString('Filamer Christian University Inc.', $html);
        $this->assertStringContainsString('Event Booking Slip', $html);
        $this->assertStringContainsString('Chapel recital', $html);
        $this->assertStringContainsString('No description recorded.', $html);
        $this->assertStringContainsString('University Chapel', $html);
        $this->assertStringContainsString('Slip Office A', $html);
        $this->assertStringContainsString('Sound system', $html);
        $this->assertStringContainsString('With microphones', $html);
        $this->assertStringContainsString('No fee breakdown is recorded on this booking.', $html);
        $this->assertStringContainsString('No letter of request is attached.', $html);
        $this->assertStringContainsString('Signature placeholder', $html);
        $this->assertStringContainsString('Office Head', $html);
        $this->assertStringContainsString('Event Admin', $html);
        $this->assertStringContainsString('Event Approval Admin', $html);
        $this->assertStringContainsString('Super Admin', $html);
        $this->assertStringContainsString('Endorsed for the chapel', $html);
        $this->assertStringContainsString('Flow '.Role::DEAN_OFFICE_HEAD, $html);
        $this->assertStringContainsString('Awaiting decision', $html);
        $this->assertStringNotContainsString('stored_path', $html);

        $preview = $this->asRole(Role::FACULTY_STAFF)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/booking-slip/preview');

        $preview->assertOk();
        $preview->assertHeader('content-type', 'application/pdf');
        $this->assertStringContainsString('inline', (string) $preview->headers->get('content-disposition'));
        $this->assertStringStartsWith('%PDF', $preview->getContent());

        $download = $this->asRole(Role::FACULTY_STAFF)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/booking-slip/download');

        $download->assertOk();
        $this->assertStringContainsString('attachment', (string) $download->headers->get('content-disposition'));
        $this->assertStringContainsString(
            'FCU-Event-Booking-Slip-'.$booking->event_booking_id.'.pdf',
            (string) $download->headers->get('content-disposition'),
        );
        $this->assertStringStartsWith('%PDF', $download->getContent());
        $this->assertSame(1, $booking->approvals()->count());
        $this->assertSame(ApprovalStage::EVENT_ADMIN, $booking->fresh()->approval_stage);
    }

    public function test_student_owner_and_event_admin_can_generate_the_slip(): void
    {
        $booking = $this->makeBooking($this->users[Role::STUDENT_REPUBLIC], 'Student assembly');

        $this->asRole(Role::STUDENT_REPUBLIC)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/booking-slip/preview')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->asRole(Role::EVENT_ADMIN)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/booking-slip/download')
            ->assertOk();
    }

    public function test_other_offices_and_unauthorized_roles_cannot_read_the_slip(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole('faculty-b')
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/booking-slip/preview')
            ->assertForbidden();

        $this->asRole(Role::VEHICLE_ADMIN)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/booking-slip/download')
            ->assertForbidden();

        $this->assertSame(0, EventBookingApproval::count());
    }

    public function test_same_office_dean_can_preview_and_another_office_dean_cannot(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $deanB = $this->userFor(Role::DEAN_OFFICE_HEAD, $this->officeB, 'dean-b');

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/booking-slip/preview')
            ->assertOk();

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $this->actingAs($deanB, 'web')
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/booking-slip/download')
            ->assertForbidden();
    }

    private function makeBooking(User $owner, string $purpose = 'Chapel recital'): EventBooking
    {
        return EventBooking::create([
            'venue_id' => $this->venue->venue_id,
            'purpose' => $purpose,
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '11:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 40,
            'requested_by' => $owner->first_name.' '.$owner->last_name,
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ]);
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
            'first_name' => 'Flow',
            'last_name' => $slug,
            'email' => $suffix.'@example.com',
            'username' => $suffix,
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }
}
