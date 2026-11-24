<?php

namespace Tests\Feature\Rbac;

use App\EventBookings\EventBookingSlip;
use App\Models\EventBooking;
use App\Signatures\SignatureStorage;
use Illuminate\Support\Facades\Storage;
use Tests\Support\ProvidesUserSignature;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueResource;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class VenueRateTest extends TestCase
{
    use ProvidesUserSignature;
    use RefreshDatabase;

    private Office $officeA;

    private Office $officeB;

    private Venue $hall;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-23 10:00:00'));
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->officeA = Office::create([
            'office_code' => 'VR-A',
            'office_name' => 'Rate Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->officeB = Office::create([
            'office_code' => 'VR-B',
            'office_name' => 'Rate Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->hall = Venue::create([
            'venue' => 'Rate Hall',
            'description' => 'Existing hall',
            'capacity' => 80,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        foreach ([
            Role::EVENT_ADMIN,
            Role::FACULTY_STAFF,
            Role::STUDENT_REPUBLIC,
        ] as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        $this->users['faculty-b'] = $this->userFor(Role::FACULTY_STAFF, $this->officeB, 'faculty-b');

        Storage::fake(SignatureStorage::USER_DISK);
        Storage::fake(SignatureStorage::APPROVAL_DISK);
        $this->giveSignature($this->users[Role::FACULTY_STAFF]);
        $this->giveSignature($this->users[Role::STUDENT_REPUBLIC]);
        $this->giveSignature($this->users['faculty-b']);
    }

    public function test_event_admin_can_manage_venues_and_rates_and_faculty_cannot_edit(): void
    {
        $created = $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/storeVenue', [
                'venue' => 'Business Hall',
                'description' => 'Managed by the business office',
                'capacity' => 40,
                'location' => 'East Wing',
                'facilities' => ['Air conditioning'],
                'status' => 'unavailable',
            ]);

        $created->assertCreated();
        $venueId = $created->json('data.venue_id');

        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/venues/updateVenue/'.$venueId, [
                'venue' => 'Business Hall',
                'description' => 'Managed by the business office',
                'capacity' => 40,
                'location' => 'East Wing',
                'status' => 'available',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'available');

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/venues/updateVenue/'.$venueId, [
                'venue' => 'Renamed by finance',
                'capacity' => 40,
                'location' => 'East Wing',
                'status' => 'unavailable',
            ])
            ->assertForbidden();

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', $this->hourlyRate())
            ->assertForbidden();

        $this->asRole(Role::STUDENT_REPUBLIC)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', $this->hourlyRate())
            ->assertForbidden();

        $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/venues/'.$this->hall->venue_id.'/rates')
            ->assertOk();

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', $this->hourlyRate())
            ->assertForbidden();

        $saved = $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', $this->hourlyRate())
            ->assertCreated()
            ->assertJsonPath('data.hourly_rate', '100.00');

        $this->assertSame(1, Venue::where('venue', 'Rate Hall')->count());
        $this->assertNotNull($saved->json('data.venue_rate_id'));
    }

    public function test_inactive_venues_cannot_be_booked_and_fees_follow_the_schedule(): void
    {
        $closed = Venue::create([
            'venue' => 'Closed Hall',
            'capacity' => 20,
            'location' => 'Campus',
            'status' => 'unavailable',
            'is_deleted' => false,
        ]);

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->bookingPayload($closed->venue_id))
            ->assertStatus(422)
            ->assertJsonValidationErrors('venue_id');

        $sound = VenueResource::create([
            'venue_id' => $this->hall->venue_id,
            'resource_name' => 'Sound system',
            'total_quantity' => 4,
            'availability_type' => 'available',
            'condition' => 'good',
        ]);

        $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', [
                'pricing_basis' => 'hourly',
                'hourly_rate' => 100,
                'overtime_rate' => 200,
                'included_hours' => 1,
                'effective_from' => now()->toDateString(),
                'charges' => [
                    [
                        'charge_name' => 'Air conditioning',
                        'charge_type' => 'facility',
                        'amount' => 50,
                        'unit' => 'per_day',
                    ],
                    [
                        'charge_name' => 'Setup',
                        'charge_type' => 'facility',
                        'amount' => 25,
                        'unit' => 'per_booking',
                    ],
                    [
                        'charge_name' => 'Sound system',
                        'charge_type' => 'equipment',
                        'amount' => 10,
                        'unit' => 'per_day',
                        'venue_resource_id' => $sound->resource_id,
                    ],
                ],
            ])
            ->assertCreated();

        $booked = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->bookingPayload($this->hall->venue_id, [
                'date_end' => now()->addDays(3)->toDateString(),
                'time_start' => '09:00',
                'time_end' => '12:00',
                'total_amount' => 1,
                'resources' => [[
                    'resource_id' => $sound->resource_id,
                    'resource_name' => 'Sound system',
                    'quantity' => 2,
                ]],
            ]));

        $booked->assertStatus(422)->assertJsonValidationErrors('total_amount');
        $this->assertSame(0, EventBooking::count());

        $booked = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->bookingPayload($this->hall->venue_id, [
                'date_end' => now()->addDays(3)->toDateString(),
                'time_start' => '09:00',
                'time_end' => '12:00',
                'resources' => [[
                    'resource_id' => $sound->resource_id,
                    'resource_name' => 'Sound system',
                    'quantity' => 2,
                ]],
            ]))
            ->assertCreated();

        $booked->assertJsonPath('data.fee_snapshot.total_amount', '1165.00');
        $booked->assertJsonPath('data.fee_snapshot.venue_amount', '200.00');
        $booked->assertJsonPath('data.fee_snapshot.overtime_amount', '800.00');
        $booked->assertJsonPath('data.fee_snapshot.additional_amount', '165.00');

        $booking = EventBooking::findOrFail($booked->json('data.event_booking_id'));
        $html = view('event-bookings.slip', [
            'slip' => EventBookingSlip::data($booking),
        ])->render();

        $this->assertStringContainsString('1,165.00', $html);
        $this->assertStringContainsString('Overtime', $html);
        $this->assertStringContainsString('Sound system', $html);
        $this->assertStringContainsString('Total fee', $html);

        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/venues/'.$this->hall->venue_id.'/rates/'.$booking->feeSnapshot->venue_rate_id, [
                'pricing_basis' => 'hourly',
                'hourly_rate' => 999,
                'overtime_rate' => 200,
                'included_hours' => 1,
                'effective_from' => now()->toDateString(),
            ])
            ->assertStatus(422);

        $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', [
                'pricing_basis' => 'hourly',
                'hourly_rate' => 5,
                'overtime_rate' => 0,
                'effective_from' => now()->addDays(10)->toDateString(),
            ])
            ->assertCreated();

        $this->assertSame('1165.00', $booking->feeSnapshot()->first()->total_amount);

        $this->asRole('faculty-b')
            ->getJson('/api/event-bookings/'.$booking->event_booking_id)
            ->assertForbidden();
    }

    public function test_daily_rates_charge_each_booked_date_and_old_bookings_keep_their_snapshot(): void
    {
        $dailyHall = Venue::create([
            'venue' => 'Daily Hall',
            'capacity' => 30,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/'.$dailyHall->venue_id.'/rates', [
                'pricing_basis' => 'daily',
                'daily_rate' => 1000,
                'overtime_rate' => 150,
                'included_hours' => 8,
                'effective_from' => now()->toDateString(),
            ])
            ->assertCreated();

        $booked = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->bookingPayload($dailyHall->venue_id, [
                'date_end' => now()->addDays(3)->toDateString(),
                'time_start' => '08:00',
                'time_end' => '11:00',
            ]))
            ->assertCreated()
            ->assertJsonPath('data.fee_snapshot.total_amount', '2000.00')
            ->assertJsonPath('data.fee_snapshot.overtime_amount', '0.00');

        $historical = EventBooking::create([
            'venue_id' => $dailyHall->venue_id,
            'purpose' => 'Recorded before rates',
            'schedule_type' => 'range',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '13:00:00',
            'time_end' => '14:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 5,
            'requested_by' => 'Existing requester',
            'requested_by_user_id' => $this->users[Role::FACULTY_STAFF]->user_id,
            'office_id' => $this->officeA->office_id,
            'email' => 'existing@example.com',
            'tel_number' => '5551111',
            'status' => 'pending',
            'approval_stage' => 'office_head',
            'is_deleted' => false,
        ]);

        $html = view('event-bookings.slip', [
            'slip' => EventBookingSlip::data($historical),
        ])->render();

        $this->assertStringContainsString('No fee breakdown is recorded on this booking.', $html);
        $this->assertStringNotContainsString('2000.00', $html);

        $this->assertSame('2000.00', $booked->json('data.fee_snapshot.total_amount'));
    }

    public function test_a_booking_without_a_configured_rate_does_not_invent_a_fee(): void
    {
        $open = Venue::create([
            'venue' => 'Unrated Hall',
            'capacity' => 15,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
            'overtime_rate' => 999,
        ]);

        $booked = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->bookingPayload($open->venue_id))
            ->assertCreated();

        $booked->assertJsonPath('data.fee_snapshot.total_amount', null);

        $html = view('event-bookings.slip', [
            'slip' => EventBookingSlip::data(EventBooking::findOrFail($booked->json('data.event_booking_id'))),
        ])->render();

        $this->assertStringContainsString(
            'No applicable venue rate was configured when this booking was submitted.',
            $html
        );
        $this->assertStringNotContainsString('999.00', $html);
    }

    public function test_booking_users_can_read_rates_but_only_managers_can_edit_overtime(): void
    {
        $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', $this->hourlyRate())
            ->assertCreated();

        $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/venues/'.$this->hall->venue_id.'/rates')
            ->assertOk()
            ->assertJsonPath('data.0.hourly_rate', '100.00');

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/venues/updateVenue/'.$this->hall->venue_id, [
                'overtime_rate' => 80,
                'overtime_policy' => 'Changed by faculty',
            ])
            ->assertForbidden();

        $this->asRole(Role::STUDENT_REPUBLIC)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', $this->hourlyRate())
            ->assertForbidden();

        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/venues/updateVenue/'.$this->hall->venue_id, [
                'overtime_rate' => 80,
                'overtime_policy' => 'After the included hours',
            ])
            ->assertOk()
            ->assertJsonPath('data.overtime_rate', '80.00')
            ->assertJsonPath('data.overtime_policy', 'After the included hours');

        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/venues/updateVenue/'.$this->hall->venue_id, [
                'description' => 'Updated without touching legacy overtime',
            ])
            ->assertOk()
            ->assertJsonPath('data.overtime_rate', '80.00')
            ->assertJsonPath('data.overtime_policy', 'After the included hours');

        $unrated = Venue::create([
            'venue' => 'Preview Hall',
            'capacity' => 10,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/previewFee', $this->bookingPayload($unrated->venue_id))
            ->assertOk()
            ->assertJsonPath('data.total_amount', null)
            ->assertJsonPath(
                'data.calculation_note',
                'No applicable venue rate was configured when this booking was submitted.'
            );

        $quoted = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/previewFee', $this->bookingPayload($this->hall->venue_id))
            ->assertOk();

        $quoted->assertJsonPath('data.total_amount', '200.00');
        $quoted->assertJsonPath('data.lines.0.line_type', 'venue');

        $saved = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->bookingPayload($this->hall->venue_id, [
                'purpose' => 'Snapshot stays',
                'time_start' => '13:00',
                'time_end' => '15:00',
            ]))
            ->assertCreated()
            ->json('data.fee_snapshot.total_amount');

        $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', [
                'pricing_basis' => 'hourly',
                'hourly_rate' => 1,
                'overtime_rate' => 0,
                'effective_from' => now()->addMonth()->toDateString(),
            ])
            ->assertCreated();

        $this->assertSame($saved, EventBooking::where('purpose', 'Snapshot stays')->firstOrFail()->feeSnapshot->total_amount);
    }

    public function test_venue_overtime_fields_do_not_change_the_dated_rate_fee(): void
    {
        $this->hall->update([
            'overtime_rate' => 500,
            'overtime_policy' => 'After 5:00 PM on weekdays',
        ]);

        $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', [
                'pricing_basis' => 'hourly',
                'hourly_rate' => 100,
                'overtime_rate' => 40,
                'included_hours' => 1,
                'effective_from' => now()->toDateString(),
                'overtime_policy' => 'Hours beyond the included time on this rate',
            ])
            ->assertCreated();

        $preview = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/previewFee', $this->bookingPayload($this->hall->venue_id, [
                'time_start' => '09:00',
                'time_end' => '12:00',
            ]))
            ->assertOk();

        $preview->assertJsonPath('data.venue_amount', '100.00');
        $preview->assertJsonPath('data.overtime_amount', '80.00');
        $preview->assertJsonPath('data.total_amount', '180.00');

        $saved = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->bookingPayload($this->hall->venue_id, [
                'purpose' => 'Dated overtime only',
                'time_start' => '09:00',
                'time_end' => '12:00',
            ]))
            ->assertCreated();

        $this->assertSame(
            $preview->json('data.total_amount'),
            $saved->json('data.fee_snapshot.total_amount')
        );
        $this->assertSame('80.00', $saved->json('data.fee_snapshot.overtime_amount'));

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/venues/updateVenue/'.$this->hall->venue_id, [
                'overtime_rate' => 900,
                'overtime_policy' => 'Finance change',
            ])
            ->assertForbidden();

        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/venues/updateVenue/'.$this->hall->venue_id, [
                'overtime_rate' => 900,
                'overtime_policy' => 'Changed after the booking',
            ])
            ->assertOk();

        $this->assertSame(
            '180.00',
            EventBooking::where('purpose', 'Dated overtime only')->firstOrFail()->feeSnapshot->total_amount
        );
    }

    public function test_editing_the_dated_overtime_rate_changes_new_quotes_only(): void
    {
        $created = $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', $this->hourlyRate())
            ->assertCreated();

        $rateId = $created->json('data.venue_rate_id');

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/venues/'.$this->hall->venue_id.'/rates/'.$rateId, [
                'pricing_basis' => 'hourly',
                'hourly_rate' => 100,
                'overtime_rate' => 40,
                'included_hours' => 1,
                'effective_from' => now()->toDateString(),
            ])
            ->assertForbidden();

        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/venues/'.$this->hall->venue_id.'/rates/'.$rateId, [
                'pricing_basis' => 'hourly',
                'hourly_rate' => 100,
                'overtime_rate' => 40,
                'included_hours' => 1,
                'effective_from' => now()->toDateString(),
            ])
            ->assertOk()
            ->assertJsonPath('data.overtime_rate', '40.00')
            ->assertJsonPath('data.included_hours', '1.00');

        $shown = $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/venues/'.$this->hall->venue_id.'/rates')
            ->assertOk();

        $shown->assertJsonPath('data.0.overtime_rate', '40.00');
        $shown->assertJsonPath('data.0.included_hours', '1.00');

        $preview = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/previewFee', $this->bookingPayload($this->hall->venue_id, [
                'time_start' => '09:00',
                'time_end' => '12:00',
            ]))
            ->assertOk();

        $preview->assertJsonPath('data.overtime_amount', '80.00');
        $preview->assertJsonPath('data.total_amount', '180.00');

        $saved = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->bookingPayload($this->hall->venue_id, [
                'purpose' => 'Edited dated overtime',
                'time_start' => '09:00',
                'time_end' => '12:00',
            ]))
            ->assertCreated();

        $this->assertSame('180.00', $saved->json('data.fee_snapshot.total_amount'));

        $this->asRole(Role::EVENT_ADMIN)
            ->putJson('/api/venues/'.$this->hall->venue_id.'/rates/'.$rateId, [
                'pricing_basis' => 'hourly',
                'hourly_rate' => 100,
                'overtime_rate' => 99,
                'included_hours' => 1,
                'effective_from' => now()->toDateString(),
            ])
            ->assertStatus(422);

        $this->assertSame(
            '180.00',
            EventBooking::where('purpose', 'Edited dated overtime')->firstOrFail()->feeSnapshot->total_amount
        );
    }

    public function test_charge_categories_stay_separate_and_approval_does_not_recalculate(): void
    {
        $chairs = VenueResource::create([
            'venue_id' => $this->hall->venue_id,
            'resource_name' => 'Plastic chairs',
            'total_quantity' => 20,
            'availability_type' => 'available',
            'condition' => 'good',
        ]);

        $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/'.$this->hall->venue_id.'/rates', [
                'pricing_basis' => 'hourly',
                'hourly_rate' => 100,
                'overtime_rate' => 40,
                'effective_from' => now()->toDateString(),
                'charges' => [
                    [
                        'charge_name' => 'Extra air conditioning',
                        'charge_type' => 'facility',
                        'amount' => 10,
                        'unit' => 'per_day',
                    ],
                    [
                        'charge_name' => 'Chairs taken outside',
                        'charge_type' => 'equipment',
                        'amount' => 5,
                        'unit' => 'per_booking',
                        'venue_resource_id' => $chairs->resource_id,
                    ],
                    [
                        'charge_name' => 'Facilitator',
                        'charge_type' => 'service',
                        'amount' => 20,
                        'unit' => 'per_hour',
                    ],
                ],
            ])
            ->assertCreated();

        $preview = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/previewFee', $this->bookingPayload($this->hall->venue_id, [
                'resources' => [[
                    'resource_id' => $chairs->resource_id,
                    'quantity' => 2,
                ]],
            ]))
            ->assertOk();

        $preview->assertJsonPath('data.venue_amount', '200.00');
        $preview->assertJsonPath('data.overtime_amount', '0.00');
        $preview->assertJsonPath('data.facility_amount', '10.00');
        $preview->assertJsonPath('data.equipment_amount', '10.00');
        $preview->assertJsonPath('data.service_amount', '40.00');
        $preview->assertJsonPath('data.additional_amount', '60.00');
        $preview->assertJsonPath('data.total_amount', '260.00');

        $saved = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->bookingPayload($this->hall->venue_id, [
                'purpose' => 'Separated charges',
                'total_amount' => 1,
                'resources' => [[
                    'resource_id' => $chairs->resource_id,
                    'quantity' => 2,
                ]],
            ]))
            ->assertStatus(422);

        $saved = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', $this->bookingPayload($this->hall->venue_id, [
                'purpose' => 'Separated charges',
                'resources' => [[
                    'resource_id' => $chairs->resource_id,
                    'quantity' => 2,
                ]],
            ]))
            ->assertCreated();

        $snapshotId = $saved->json('data.fee_snapshot.event_booking_fee_snapshot_id');
        $this->assertSame('260.00', $saved->json('data.fee_snapshot.total_amount'));
        $this->assertEqualsCanonicalizing(
            ['venue', 'facility', 'equipment', 'service'],
            collect($saved->json('data.fee_snapshot.lines'))->pluck('line_type')->unique()->all(),
        );

        $dean = $this->userFor(Role::DEAN_OFFICE_HEAD);
        Storage::fake(SignatureStorage::USER_DISK);
        Storage::fake(SignatureStorage::APPROVAL_DISK);
        $this->giveSignature($dean);

        $this->actingAs($dean, 'web')
            ->putJson('/api/event-bookings/updateStatus/'.$saved->json('data.event_booking_id'), [
                'status' => 'approved',
            ])
            ->assertOk();

        $booking = EventBooking::where('purpose', 'Separated charges')->firstOrFail();
        $this->assertSame($snapshotId, $booking->feeSnapshot->event_booking_fee_snapshot_id);
        $this->assertSame('260.00', $booking->feeSnapshot->total_amount);

        $html = view('event-bookings.slip', [
            'slip' => EventBookingSlip::data($booking),
        ])->render();
        $this->assertStringContainsString('Base facility rental', $html);
        $this->assertStringContainsString('Additional facility charge', $html);
        $this->assertStringContainsString('Equipment charge', $html);
        $this->assertStringContainsString('Additional service charge', $html);
        $this->assertStringContainsString('260.00', $html);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_regular_hours_are_eight_to_five_and_the_add_form_saves_the_opening_rate(): void
    {
        $created = $this->asRole(Role::EVENT_ADMIN)
            ->postJson('/api/venues/storeVenue', [
                'venue' => 'Morning Hall',
                'capacity' => 20,
                'location' => 'Campus',
                'rate' => [
                    'pricing_basis' => 'hourly',
                    'base_amount' => 100,
                    'overtime_rate' => 40,
                    'overtime_policy' => 'Weekday regular hours. Weekends are overtime.',
                    'effective_from' => '2026-11-16',
                    'resources' => [[
                        'resource_name' => 'Sound system',
                        'overtime_rate' => 25,
                    ]],
                ],
            ])
            ->assertCreated();

        $venueId = (int) $created->json('data.venue_id');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/previewFee', $this->bookingPayload($venueId, [
                'time_start' => '07:00',
                'time_end' => '09:00',
            ]))
            ->assertOk()
            ->assertJsonPath('data.venue_amount', '100.00')
            ->assertJsonPath('data.overtime_amount', '40.00');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/previewFee', $this->bookingPayload($venueId, [
                'time_start' => '08:00',
                'time_end' => '17:00',
            ]))
            ->assertOk()
            ->assertJsonPath('data.venue_amount', '900.00')
            ->assertJsonPath('data.overtime_amount', '0.00')
            ->assertJsonPath('data.equipment_amount', '0.00');

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/previewFee', $this->bookingPayload($venueId, [
                'date_start' => '2026-11-28',
                'date_end' => '2026-11-28',
                'time_start' => '08:00',
                'time_end' => '10:00',
            ]))
            ->assertOk()
            ->assertJsonPath('data.venue_amount', '0.00')
            ->assertJsonPath('data.overtime_amount', '80.00')
            ->assertJsonPath('data.equipment_amount', '50.00');
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function bookingPayload(int $venueId, array $overrides = []): array
    {
        return array_merge([
            'venue_id' => $venueId,
            'purpose' => 'Rate check',
            'schedule_type' => 'range',
            'date_start' => now()->addDays(2)->toDateString(),
            'date_end' => now()->addDays(2)->toDateString(),
            'time_start' => '09:00',
            'time_end' => '11:00',
            'expected_attendees' => 10,
            'requested_by' => 'Faculty requester',
            'office_id' => $this->officeA->office_id,
            'email' => $this->users[Role::FACULTY_STAFF]->email,
            'tel_number' => '5550000',
        ], $overrides);
    }

    /**
     * @return array<string, mixed>
     */
    private function hourlyRate(): array
    {
        return [
            'pricing_basis' => 'hourly',
            'hourly_rate' => 100,
            'overtime_rate' => 0,
            'effective_from' => now()->toDateString(),
            'is_active' => true,
        ];
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
        $name = $key ?? $slug;

        return User::create([
            'first_name' => 'Rate',
            'last_name' => $name,
            'email' => $name.'@example.com',
            'username' => $name,
            'password' => Hash::make('password'),
            'office_id' => ($office ?? $this->officeA)->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }
}
