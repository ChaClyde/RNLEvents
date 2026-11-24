<?php

namespace Tests\Feature\Rbac;

use App\EventBookings\EventBookingSlip;
use App\Models\EventBooking;
use App\Models\EventBookingApproval;
use App\Models\EventBookingFeeLine;
use App\Models\EventBookingFeeSnapshot;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueRate;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EventBookingSlipPresentationTest extends TestCase
{
    use RefreshDatabase;

    private Office $office;

    private User $faculty;

    private User $eventAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->office = Office::create([
            'office_code' => 'SLP',
            'office_name' => 'Slip Presentation',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->faculty = $this->user(Role::FACULTY_STAFF, 'faculty-slip');
        $this->eventAdmin = $this->user(Role::EVENT_ADMIN, 'event-admin-slip');
    }

    public function test_saved_fee_categories_print_without_recalculating_the_snapshot(): void
    {
        $hall = $this->venue('Roblee Hall');
        $booking = $this->booking($hall, 'All charges');
        $rate = VenueRate::create([
            'venue_id' => $hall->venue_id,
            'pricing_basis' => 'hourly',
            'hourly_rate' => 100,
            'overtime_rate' => 40,
            'effective_from' => now()->toDateString(),
            'is_active' => true,
        ]);
        $snapshot = $this->snapshot($booking, $rate->venue_rate_id, '265.00', [
            ['venue', 'Base facility rental', '2.00', 'hour', '100.00', '200.00'],
            ['overtime', 'Overtime', '1.00', 'hour', '40.00', '40.00'],
            ['facility', 'Extra air conditioning', '1.00', 'hour', '10.00', '10.00'],
            ['equipment', 'Projector', '1.00', 'hour', '5.00', '5.00'],
            ['service', 'Facilitator', '1.00', 'hour', '10.00', '10.00'],
        ]);

        $html = $this->html($booking);
        foreach ([
            'Base facility rental',
            'Overtime',
            'Additional facility charge',
            'Equipment charge',
            'Additional service charge',
            'Grand total',
            '265.00',
            'Extra air conditioning',
            'Projector',
            'Facilitator',
        ] as $text) {
            $this->assertStringContainsString($text, $html);
        }
        $this->assertStringNotContainsString('FCU Gym policy', $html);

        $rate->update(['hourly_rate' => 999, 'overtime_rate' => 999]);
        $again = $this->html($booking->fresh());
        $this->assertStringContainsString('265.00', $again);
        $this->assertStringNotContainsString('999.00', $again);
        $this->assertSame('265.00', $snapshot->fresh()->total_amount);
    }

    public function test_historical_additional_lines_and_missing_fees_stay_compatible(): void
    {
        $hall = $this->venue('AVCC');
        $old = $this->booking($hall, 'Old additional');
        $this->snapshot($old, null, '15.00', [
            ['additional', 'Setup', '1.00', 'booking', '15.00', '15.00'],
        ]);
        $oldHtml = $this->html($old);
        $this->assertStringContainsString('Additional charge', $oldHtml);
        $this->assertStringContainsString('Setup', $oldHtml);

        $empty = $this->booking($hall, 'No fee');
        $this->assertStringContainsString(
            'No fee breakdown is recorded on this booking.',
            $this->html($empty)
        );
    }

    public function test_gym_policy_prints_only_for_the_gym_and_records_the_exception(): void
    {
        $gym = $this->venue('FCU Gym');
        $acknowledged = $this->booking($gym, 'Acknowledged gym', [
            'gym_responsibilities_acknowledged' => true,
            'gym_responsibility_statement' => 'Maintain cleanliness. Protect facilities and equipment. Negligent damage will be charged to the responsible organization, department, or group.',
            'reservation_span' => 'whole_semester',
        ]);
        $ackHtml = $this->html($acknowledged);
        $this->assertStringContainsString('FCU Gym policy', $ackHtml);
        $this->assertStringContainsString('Acknowledged', $ackHtml);
        $this->assertStringContainsString('Whole semester', $ackHtml);
        $this->assertStringContainsString('Not designated', $ackHtml);
        $this->assertStringContainsString('Maintain cleanliness.', $ackHtml);

        $exception = $this->booking($gym, 'University activity', [
            'university_wide_activity' => true,
            'university_wide_designated_by' => $this->eventAdmin->user_id,
            'university_wide_designated_at' => now(),
            'gym_responsibilities_acknowledged' => true,
            'gym_responsibility_statement' => 'Maintain cleanliness.',
        ]);
        $exceptionHtml = $this->html($exception);
        $this->assertStringContainsString('Designated by Gym event-admin-slip', $exceptionHtml);
        $this->assertStringNotContainsString($this->eventAdmin->email, $exceptionHtml);

        $plain = $this->booking($gym, 'Ordinary gym');
        $this->assertStringContainsString('Not acknowledged', $this->html($plain));
        $this->assertStringContainsString('Not designated', $this->html($plain));

        $hall = $this->booking($this->venue('Chapel'), 'Chapel use', [
            'university_wide_activity' => true,
            'university_wide_designated_by' => $this->eventAdmin->user_id,
            'university_wide_designated_at' => now(),
        ]);
        $this->assertStringNotContainsString('FCU Gym policy', $this->html($hall));
    }

    public function test_rejected_approval_remarks_print_without_a_signature(): void
    {
        $booking = $this->booking($this->venue('Library'), 'Rejected request');
        EventBookingApproval::create([
            'event_booking_id' => $booking->event_booking_id,
            'approver_user_id' => $this->faculty->user_id,
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'action' => EventBookingApproval::ACTION_REJECTED,
            'remarks' => 'Schedule does not fit the office.',
            'signer_name' => 'Dean Reviewer',
            'signer_position' => 'Office Head',
        ]);

        $html = $this->html($booking);
        $this->assertStringContainsString('Rejected', $html);
        $this->assertStringContainsString('Schedule does not fit the office.', $html);
        $this->assertStringContainsString('Dean Reviewer', $html);
        $this->assertStringContainsString('Office Head', $html);
        $this->assertStringContainsString('Rejected approvals are not signed.', $html);
        $this->assertStringContainsString('Event Approval Admin', $html);
        $this->assertStringNotContainsString('Business Manager', $html);
    }

    private function html(EventBooking $booking): string
    {
        return view('event-bookings.slip', [
            'slip' => EventBookingSlip::data($booking),
        ])->render();
    }

    /**
     * @param  list<array{0: string, 1: string, 2: string, 3: string, 4: string, 5: string}>  $lines
     */
    private function snapshot(EventBooking $booking, ?int $rateId, string $total, array $lines): EventBookingFeeSnapshot
    {
        $snapshot = EventBookingFeeSnapshot::create([
            'event_booking_id' => $booking->event_booking_id,
            'venue_rate_id' => $rateId,
            'pricing_basis' => 'hourly',
            'total_amount' => $total,
            'calculation_note' => 'Saved with the booking.',
            'calculated_at' => now(),
        ]);

        foreach ($lines as $index => $line) {
            EventBookingFeeLine::create([
                'event_booking_fee_snapshot_id' => $snapshot->event_booking_fee_snapshot_id,
                'line_type' => $line[0],
                'label' => $line[1],
                'quantity' => $line[2],
                'unit' => $line[3],
                'unit_amount' => $line[4],
                'line_amount' => $line[5],
                'sort_order' => $index,
            ]);
        }

        return $snapshot;
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private function booking(Venue $venue, string $purpose, array $extra = []): EventBooking
    {
        return EventBooking::create(array_merge([
            'venue_id' => $venue->venue_id,
            'purpose' => $purpose,
            'schedule_type' => 'range',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '09:00',
            'time_end' => '11:00',
            'number_of_days' => 1,
            'expected_attendees' => 10,
            'requested_by' => 'Requester',
            'requested_by_user_id' => $this->faculty->user_id,
            'office_id' => $this->office->office_id,
            'email' => 'requester@example.com',
            'tel_number' => '5550000',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ], $extra));
    }

    private function venue(string $name): Venue
    {
        return Venue::create([
            'venue' => $name,
            'capacity' => 100,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);
    }

    private function user(string $slug, string $key): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();

        return User::create([
            'first_name' => 'Gym',
            'last_name' => $key,
            'email' => $key.'@example.com',
            'username' => $key,
            'password' => Hash::make('password'),
            'office_id' => $this->office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ]);
    }
};
