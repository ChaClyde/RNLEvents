<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\EventBookings\EventApprovalWorkflow;
use App\Models\EventBooking;
use App\Models\EventBookingSchedule;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueMaintenance;
use App\Permissions\AbilityRule;
use App\Permissions\ApprovalStage;
use App\Permissions\Permission;
use App\Permissions\PermissionCatalog;
use App\Permissions\PermissionChecker;
use App\Scheduling\AdvanceBookingPolicy;
use App\Scheduling\BookingHoursPolicy;
use App\Scheduling\BookingScheduleBuilder;
use App\Venues\VenueFeeCalculator;
use App\Venues\VenueFeeRecorder;
use App\Scheduling\GymUsagePolicy;
use App\Scheduling\TimeFormat;
use App\Scheduling\VenueConflictChecker;
use App\Signatures\SignatureStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EventBookingController extends Controller
{
    use ScopesQueriesByPermission;

    private function bookingRelations(): array
    {
        return ['venue', 'office', 'resources', 'schedules', 'requester', 'approvals.approver', 'attachments', 'feeSnapshot.lines', 'universityWideDesignator:user_id,first_name,last_name'];
    }

    /*
    |--------------------------------------------------------------------------
    | Load Event Bookings
    |--------------------------------------------------------------------------
    */

    public function loadEventBookings(Request $request)
    {
        $query = EventBooking::with([
            'venue:venue_id,venue,location,capacity,status',
            'office:office_id,office_name,office_code',
            'resources',
            'schedules',
            'requester',
            'approvals.approver',
            'attachments',
            'feeSnapshot.lines',
            'universityWideDesignator:user_id,first_name,last_name',
        ])->where('is_deleted', false);

        $query = $this->constrainByPermission(
            $query,
            $request->user(),
            Permission::EVENT_BOOKINGS_VIEW,
            Permission::EVENT_APPROVALS_VIEW,
        );

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('purpose', 'like', "%{$search}%")
                    ->orWhere('requested_by', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('venue', function ($venue) use ($search) {
                        $venue->where('venue', 'like', "%{$search}%");
                    })
                    ->orWhereHas('office', function ($office) use ($search) {
                        $office->where('office_name', 'like', "%{$search}%")
                            ->orWhere('office_code', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('approval_stage')) {
            $query->where('approval_stage', $request->approval_stage);
        }

        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->venue_id);
        }

        if (
            $request->filled('office_id')
            && $this->canAssignAnyOffice($request->user())
        ) {
            $query->where('office_id', $request->office_id);
        }

        if ($request->filled('date_start')) {
            $query->whereDate('date_start', '>=', $request->date_start);
        }

        if ($request->filled('date_end')) {
            $query->whereDate('date_end', '<=', $request->date_end);
        }

        return response()->json([
            'message' => 'Event bookings loaded successfully.',
            'data' => $query->orderByDesc('created_at')->get(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Load Requests Awaiting the Logged-in Approver ("My Event Requests")
    |--------------------------------------------------------------------------
    */

    public function loadAwaitingMyApproval(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');

        $stages = PermissionCatalog::ruleFor(
            $user->role?->slug,
            Permission::EVENT_APPROVALS_APPROVE
        )?->approvalStages ?? [];

        $query = EventBooking::with($this->bookingRelations())
            ->where('is_deleted', false)
            ->where('status', 'pending')
            ->whereIn('approval_stage', $stages)
            ->where(function ($q) use ($user) {
                $q->whereNull('requested_by_user_id')
                    ->orWhere('requested_by_user_id', '!=', $user->user_id);
            });

        // Applies the dean's office scope.
        $query = app(PermissionChecker::class)
            ->constrainQuery($query, $user, Permission::EVENT_APPROVALS_APPROVE);

        return response()->json([
            'message' => 'Requests awaiting your approval loaded successfully.',
            'data' => $query->orderBy('created_at')->get(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Get Event Booking
    |--------------------------------------------------------------------------
    */

    public function getEventBooking($event_booking_id)
    {
        $eventBooking = EventBooking::with($this->bookingRelations())
            ->where('is_deleted', false)
            ->findOrFail($event_booking_id);

        return response()->json([
            'message' => 'Event booking retrieved successfully.',
            'data' => $eventBooking,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Check Availability (dry run: conflicts + suggestions, saves nothing)
    |--------------------------------------------------------------------------
    */

    public function checkAvailability(Request $request)
    {
        $this->normalizeTimes($request);

        $validated = $request->validate(array_merge([
            'venue_id' => [
                'required',
                'integer',
                Rule::exists('tbl_venues', 'venue_id')
                    ->where(fn ($q) => $q->where('is_deleted', false)),
            ],
            'exclude_event_booking_id' => ['nullable', 'integer'],
        ], $this->scheduleRules()), $this->scheduleMessages());

        $occurrences = app(BookingScheduleBuilder::class)->build($validated);
        $checker = app(VenueConflictChecker::class);
        $exclude = $validated['exclude_event_booking_id'] ?? null;

        $conflicts = $checker->detect($validated['venue_id'], $occurrences, $exclude);
        $venue = Venue::query()->where('is_deleted', false)->findOrFail($validated['venue_id']);
        $gym = $this->gymAvailability($request, $venue, $occurrences);
        $restrictions = $this->scheduleRestrictions($venue, $occurrences, $gym['restrictions']);

        return response()->json([
            'available' => empty($conflicts) && $restrictions === [],
            'occurrences' => array_map(fn ($o) => $o + [
                'time_start_label' => TimeFormat::label($o['time_start']),
                'time_end_label' => TimeFormat::label($o['time_end']),
            ], $occurrences),
            'conflicts' => $conflicts,
            'suggestions' => $conflicts
                ? $checker->suggest($validated['venue_id'], $occurrences, $conflicts, $exclude)
                : [],
            'schedule_restrictions' => $restrictions,
            'gym_reservation_warning' => $gym['warning'],
        ], 200);
    }

    public function previewFee(Request $request)
    {
        $this->normalizeTimes($request);

        $validated = $request->validate(array_merge(
            $this->scheduleRules(),
            $this->feeInputRules(),
            [
                'venue_id' => [
                    'required',
                    'integer',
                    Rule::exists('tbl_venues', 'venue_id')
                        ->where(fn ($query) => $query->where('is_deleted', false)),
                ],
                'resources' => ['nullable', 'array'],
                'resources.*.resource_id' => ['nullable', 'integer'],
                'resources.*.quantity' => ['nullable', 'integer', 'min:1'],
            ]
        ), $this->scheduleMessages());

        $venue = Venue::where('venue_id', $validated['venue_id'])
            ->where('is_deleted', false)
            ->firstOrFail();

        $this->assertVenueBookable($venue, $validated + ['expected_attendees' => 0]);

        $occurrences = app(BookingScheduleBuilder::class)->build($validated);
        $this->assertBookingHours($venue, $occurrences);
        $this->assertMaintenanceClear($venue->venue_id, $occurrences);

        return response()->json([
            'data' => app(VenueFeeCalculator::class)->quote(
                $venue->venue_id,
                $occurrences,
                $validated['resources'] ?? []
            ),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Store Event Booking
    |--------------------------------------------------------------------------
    */

    public function storeEventBooking(Request $request)
    {
        $validated = $this->validateBooking($request);
        $occurrences = app(BookingScheduleBuilder::class)->build($validated);

        [$eventBooking, $warning] = DB::transaction(function () use ($request, $validated, $occurrences) {

            // Lock the venue row so two requests cannot book the same slot
            $venue = Venue::where('venue_id', $validated['venue_id'])
                ->where('is_deleted', false)
                ->lockForUpdate()
                ->firstOrFail();

            $resources = $validated['resources'] ?? [];

            $this->assertVenueBookable($venue, $validated);
            $this->assertResourcesBookable($venue, $resources);
            $this->assertBookingHours($venue, $occurrences);
            $this->assertMaintenanceClear($venue->venue_id, $occurrences);
            $gym = $this->gymBookingFields($request, $venue, $validated, $occurrences);
            $this->assertCanSubmitBooking($request, $venue, $validated);

            app(VenueConflictChecker::class)->assertAvailable(
                $venue->venue_id,
                $occurrences
            );

            $data = array_merge(
                $this->prepareBookingData($validated, $request, true, $occurrences),
                $gym['fields']
            );

            $data['status'] = 'pending';
            $data['approval_stage'] = ApprovalStage::OFFICE_HEAD;

            $eventBooking = EventBooking::create($data);

            $this->syncSchedules($eventBooking, $occurrences);
            $this->syncResources($eventBooking, $venue, $resources);
            app(VenueFeeRecorder::class)->store($eventBooking, $occurrences, $resources);
            $this->attachRequesterSignature($eventBooking, $request->user());

            return [$eventBooking, $gym['warning']];
        });

        app(\App\Notifications\SystemNotifier::class)->bookingSubmitted($eventBooking, $request->user());

        return response()->json([
            'message' => 'Event booking request submitted successfully.',
            'gym_reservation_warning' => $warning,
            'data' => $eventBooking->load($this->bookingRelations()),
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Update Event Booking
    |--------------------------------------------------------------------------
    */

    public function updateEventBooking(Request $request, $event_booking_id)
    {
        $validated = $this->validateBooking($request);
        $occurrences = app(BookingScheduleBuilder::class)->build($validated);

        [$eventBooking, $warning] = DB::transaction(function () use ($request, $validated, $occurrences, $event_booking_id) {

            $venue = Venue::where('venue_id', $validated['venue_id'])
                ->where('is_deleted', false)
                ->lockForUpdate()
                ->firstOrFail();

            $eventBooking = EventBooking::where('is_deleted', false)
                ->lockForUpdate()
                ->findOrFail($event_booking_id);

            if (!$eventBooking->isRequesterEditable()) {
                throw ValidationException::withMessages([
                    'status' => ['Only unreviewed pending event bookings can be updated.'],
                ]);
            }

            $resources = $validated['resources'] ?? [];

            $this->assertVenueBookable($venue, $validated);
            $this->assertResourcesBookable($venue, $resources);
            $this->assertBookingHours($venue, $occurrences);
            $this->assertMaintenanceClear($venue->venue_id, $occurrences);
            $gym = $this->gymBookingFields($request, $venue, $validated, $occurrences);

            // Exclude the current booking from the conflict check
            app(VenueConflictChecker::class)->assertAvailable(
                $venue->venue_id,
                $occurrences,
                $eventBooking->event_booking_id
            );

            $eventBooking->update(array_merge(
                $this->prepareBookingData($validated, $request, false, $occurrences),
                $gym['fields']
            ));

            // The submitted lists replace the previous ones
            $this->syncSchedules($eventBooking, $occurrences);
            $this->syncResources($eventBooking, $venue, $resources);
            app(VenueFeeRecorder::class)->store($eventBooking, $occurrences, $resources);
            $this->attachRequesterSignature($eventBooking, $request->user());

            return [$eventBooking, $gym['warning']];
        });

        return response()->json([
            'message' => 'Event booking updated successfully.',
            'gym_reservation_warning' => $warning,
            'data' => $eventBooking->fresh()->load($this->bookingRelations()),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Move Event Booking to Trash
    |--------------------------------------------------------------------------
    */

    public function destroyEventBooking($event_booking_id)
    {
        $eventBooking = EventBooking::where('is_deleted', false)
            ->findOrFail($event_booking_id);

        $eventBooking->update([
            'is_deleted' => true,
        ]);

        return response()->json([
            'message' => 'Event booking moved to Trash Bin.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Load Event Booking Trash
    |--------------------------------------------------------------------------
    */

    public function loadTrash()
    {
        $eventBookings = EventBooking::with($this->bookingRelations())
            ->where('is_deleted', true)
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'message' => 'Event booking trash loaded successfully.',
            'data' => $eventBookings,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Restore Event Booking
    |--------------------------------------------------------------------------
    */

    public function restoreEventBooking(Request $request, $event_booking_id)
    {
        $eventBooking = DB::transaction(function () use ($event_booking_id) {

            $eventBooking = EventBooking::where('is_deleted', true)
                ->lockForUpdate()
                ->findOrFail($event_booking_id);

            // Only pending/approved bookings hold the venue schedule
            if (in_array($eventBooking->status, ['pending', 'approved'], true)) {

                Venue::where('venue_id', $eventBooking->venue_id)
                    ->lockForUpdate()
                    ->first();

                $this->assertNoConflict($eventBooking);
            }

            $eventBooking->update([
                'is_deleted' => false,
            ]);

            return $eventBooking;
        });

        return response()->json([
            'message' => 'Event booking restored successfully.',
            'data' => $eventBooking->fresh()->load($this->bookingRelations()),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Permanently Delete Event Booking
    |--------------------------------------------------------------------------
    */

    public function forceDeleteEventBooking($event_booking_id)
    {
        $eventBooking = EventBooking::where('is_deleted', true)
            ->findOrFail($event_booking_id);

        // Booking resources and schedules are removed automatically (cascadeOnDelete)
        $eventBooking->delete();

        return response()->json([
            'message' => 'Event booking permanently deleted.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Update Event Booking Status / Approval
    |--------------------------------------------------------------------------
    */

    public function updateFeeCalculation(Request $request, $event_booking_id)
    {
        $actor = $request->user();
        $actor->loadMissing('role');

        abort_unless($actor->role?->slug === Role::ADMIN_APPROVALS, 403, 'This action is unauthorized.');

        $validated = $request->validate([
            'confirm' => ['required', 'boolean'],
            'lines' => ['present', 'array'],
            'lines.*.event_booking_fee_line_id' => ['required', 'integer'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0', 'max:100000'],
            'lines.*.unit_amount' => ['required', 'numeric', 'min:0', 'max:1000000'],
        ]);

        $eventBooking = DB::transaction(function () use ($actor, $validated, $event_booking_id) {
            $eventBooking = EventBooking::where('is_deleted', false)
                ->lockForUpdate()
                ->findOrFail($event_booking_id);

            if ($eventBooking->status !== 'pending' || $eventBooking->approval_stage !== ApprovalStage::EVENT_APPROVAL) {
                throw ValidationException::withMessages([
                    'fee' => ['The venue calculation can be confirmed only while this booking is with the Event Approval Admin.'],
                ]);
            }

            app(VenueFeeRecorder::class)->adjust(
                $eventBooking,
                $validated['lines'],
                (bool) $validated['confirm'],
                $actor,
            );

            return $eventBooking;
        });

        return response()->json([
            'message' => $validated['confirm']
                ? 'Venue calculation confirmed.'
                : 'Venue calculation updated.',
            'data' => $eventBooking->fresh()->load($this->bookingRelations()),
        ]);
    }

    public function updateEventBookingStatus(Request $request, $event_booking_id)
    {
        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['approved', 'rejected', 'cancelled']),
            ],

            'approval_remarks' => [
                'required_if:status,rejected',
                'nullable',
                'string',
            ],

            'cancellation_reason' => [
                'required_if:status,cancelled',
                'nullable',
                'string',
            ],
        ]);

        $eventBooking = DB::transaction(function () use ($request, $validated, $event_booking_id) {
            $eventBooking = EventBooking::where('is_deleted', false)
                ->lockForUpdate()
                ->findOrFail($event_booking_id);

            if ($validated['status'] === 'approved') {
                // Check permission first so an unauthorized user gets 403,
                // not a venue-conflict message.
                abort_unless($request->user()->allows(Permission::EVENT_APPROVALS_APPROVE, [
                    'resource' => $eventBooking,
                    'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
                    'approval_stage' => $eventBooking->approval_stage,
                ]), 403, 'This action is unauthorized.');

                Venue::where('venue_id', $eventBooking->venue_id)
                    ->lockForUpdate()
                    ->first();

                $this->assertNoConflict($eventBooking);
            }

            return app(EventApprovalWorkflow::class)->apply(
                $request->user(),
                $eventBooking,
                $validated['status'],
                $validated,
            );
        });

        $eventBooking = $eventBooking->fresh()->load($this->bookingRelations());

        return response()->json([
            'message' => $this->statusMessage($eventBooking, $validated['status']),
            'data' => $eventBooking,
        ], 200);
    }

    private function statusMessage(EventBooking $eventBooking, string $requested): string
    {
        if ($requested === 'rejected') {
            return 'Event booking rejected.';
        }

        if ($requested === 'cancelled') {
            return 'Event booking cancelled.';
        }

        if ($eventBooking->status === 'approved') {
            return 'Event booking approved.';
        }

        return 'Event booking advanced to the next approval stage.';
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Booking Data
    |--------------------------------------------------------------------------
    */

    private function validateBooking(Request $request): array
    {
        $this->normalizeTimes($request);

        return $request->validate(array_merge($this->scheduleRules(), $this->feeInputRules(), [
            'venue_id' => [
                'required',
                'integer',
                Rule::exists('tbl_venues', 'venue_id')
                    ->where(fn ($query) => $query->where('is_deleted', false)),
            ],

            'purpose' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],

            'expected_attendees' => ['nullable', 'integer', 'min:0'],

            // Requested Resources
            'resources' => ['nullable', 'array'],

            // A linked resource must belong to the selected venue.
            // resource_id = null means "Other equipment".
            'resources.*.resource_id' => [
                'nullable',
                'integer',
                Rule::exists('tbl_venue_resources', 'resource_id')
                    ->where('venue_id', $request->input('venue_id')),
            ],

            'resources.*.resource_name' => [
                'required_without:resources.*.resource_id',
                'nullable',
                'string',
                'max:100',
            ],

            'resources.*.quantity' => ['required', 'integer', 'min:1'],

            'resources.*.notes' => ['nullable', 'string', 'max:255'],

            'requested_by' => ['required', 'string', 'max:150'],

            'office_id' => [
                'nullable',
                'integer',
                Rule::exists('tbl_offices', 'office_id'),
            ],

            'email' => ['required', 'email', 'max:150'],
            'tel_number' => ['required', 'string', 'max:30'],

            'university_wide_activity' => ['nullable', 'boolean'],
            'reservation_span' => ['nullable', Rule::in(['standard', 'whole_semester', 'whole_summer'])],
            'gym_responsibilities_acknowledged' => ['nullable', 'boolean'],
        ]), $this->scheduleMessages());
    }

    /*
    |--------------------------------------------------------------------------
    | Schedule Rules (shared by store/update/check-availability)
    |--------------------------------------------------------------------------
    */

    /**
     * @return array<string, mixed>
     */
    private function feeInputRules(): array
    {
        return [
            'total_amount' => ['prohibited'],
            'venue_amount' => ['prohibited'],
            'overtime_amount' => ['prohibited'],
            'additional_amount' => ['prohibited'],
        ];
    }

    private function scheduleRules(): array
    {
        $earliest = app(AdvanceBookingPolicy::class)->earliestDate();

        return [
            // range = every day, weekly = selected weekdays, custom = hand-picked dates
            'schedule_type' => ['required', Rule::in(['range', 'weekly', 'custom'])],

            'date_start' => ['required_unless:schedule_type,custom', 'nullable', 'date', 'after_or_equal:'.$earliest],
            'date_end' => ['required_unless:schedule_type,custom', 'nullable', 'date', 'after_or_equal:date_start'],

            // weekly: 0 = Sunday ... 6 = Saturday
            'weekdays' => ['required_if:schedule_type,weekly', 'nullable', 'array', 'min:1'],
            'weekdays.*' => ['integer', 'between:0,6'],

            'excluded_dates' => ['nullable', 'array'],
            'excluded_dates.*' => ['date'],

            // custom: hand-picked dates (time fields optional, fall back to the default time)
            'dates' => [
                'required_if:schedule_type,custom',
                'nullable',
                'array',
                'min:1',
                'max:' . BookingScheduleBuilder::MAX_OCCURRENCES,
            ],
            'dates.*.date' => ['required', 'date', 'after_or_equal:'.$earliest],
            'dates.*.time_start' => ['nullable', 'date_format:H:i'],
            'dates.*.time_end' => ['nullable', 'date_format:H:i'],

            // Default daily time
            'time_start' => ['required', 'date_format:H:i'],
            'time_end' => ['required', 'date_format:H:i', 'after:time_start'],

            // Per-date time changes (e.g. last day 1 PM - 8 PM)
            'overrides' => ['nullable', 'array'],
            'overrides.*.date' => ['required', 'date'],
            'overrides.*.time_start' => ['required', 'date_format:H:i'],
            'overrides.*.time_end' => ['required', 'date_format:H:i'],
        ];
    }

    private function scheduleMessages(): array
    {
        $msg = 'Please enter a valid time, e.g. 1:00 PM.';

        return [
            'time_start.date_format' => $msg,
            'time_end.date_format' => $msg,
            'time_end.after' => 'End time must be after the start time.',
            'date_start.after_or_equal' => AdvanceBookingPolicy::MESSAGE,
            'dates.*.date.after_or_equal' => AdvanceBookingPolicy::MESSAGE,
            'dates.*.time_start.date_format' => $msg,
            'dates.*.time_end.date_format' => $msg,
            'overrides.*.time_start.date_format' => $msg,
            'overrides.*.time_end.date_format' => $msg,
        ];
    }

    /** Accepts "1:00 PM", "1pm", "13:00" and converts to 24h "H:i" internally. */
    private function normalizeTimes(Request $request): void
    {
        $input = $request->all();

        foreach (['time_start', 'time_end'] as $key) {
            if (isset($input[$key])) {
                $input[$key] = TimeFormat::toDb($input[$key]) ?? $input[$key];
            }
        }

        foreach (['overrides', 'dates'] as $list) {
            foreach ($input[$list] ?? [] as $i => $row) {
                if (!is_array($row)) {
                    continue;
                }

                foreach (['time_start', 'time_end'] as $key) {
                    if (isset($row[$key])) {
                        $input[$list][$i][$key] = TimeFormat::toDb($row[$key]) ?? $row[$key];
                    }
                }
            }
        }

        $request->merge($input);
    }

    /*
    |--------------------------------------------------------------------------
    | Prepare Booking Data (defaults + computed fields)
    |--------------------------------------------------------------------------
    */

    private function attachRequesterSignature(EventBooking $booking, User $actor): void
    {
        $actor->loadMissing('role');

        if (!in_array($actor->role?->slug, [Role::FACULTY_STAFF, Role::STUDENT_REPUBLIC], true)) {
            return;
        }

        $snapshot = SignatureStorage::copyForRequester($actor);
        $previous = $booking->requester_signature_path;

        $booking->forceFill([
            'requester_signature_path' => $snapshot['signature_path'],
            'requester_signature_mime' => $snapshot['signature_mime'],
            'requester_signer_name' => $snapshot['signer_name'],
            'requester_signer_position' => $snapshot['signer_position'],
        ])->save();

        if (is_string($previous) && $previous !== $snapshot['signature_path']) {
            SignatureStorage::deleteApprovalFile($previous);
        }
    }

    private function prepareBookingData(
        array $validated,
        Request $request,
        bool $creating,
        array $occurrences
    ): array {
        // Saved separately
        unset(
            $validated['resources'],
            $validated['requested_by_user_id'],
            $validated['overrides'],
            $validated['dates'],
            $validated['excluded_dates'],
            $validated['university_wide_activity'],
            $validated['reservation_span'],
            $validated['gym_responsibilities_acknowledged'],
        );

        // Booking-level summary comes from the real schedule
        $validated['date_start'] = $occurrences[0]['date'];
        $validated['date_end'] = end($occurrences)['date'];
        $validated['number_of_days'] = count($occurrences);

        if ($validated['schedule_type'] !== 'weekly') {
            $validated['weekdays'] = null;
        }

        $validated['expected_attendees'] = $validated['expected_attendees'] ?? 0;

        $actor = $request->user();

        if ($creating) {
            $validated['requested_by_user_id'] = $actor->user_id;
            $validated['office_id'] = $this->authorizedOfficeId(
                $actor,
                $validated['office_id'] ?? null,
            );
        } elseif (!$this->canAssignAnyOffice($actor)) {
            unset($validated['office_id']);
        }

        return $validated;
    }

    private function canAssignAnyOffice(User $actor): bool
    {
        $actor->loadMissing('role');

        return PermissionCatalog::ruleFor($actor->role?->slug, Permission::USERS_VIEW)?->scope
            === AbilityRule::SCOPE_GLOBAL;
    }

    private function authorizedOfficeId(User $actor, mixed $submitted): int
    {
        if ($this->canAssignAnyOffice($actor) && $submitted) {
            return (int) $submitted;
        }

        return (int) $actor->office_id;
    }

    /*
    |--------------------------------------------------------------------------
    | Venue Availability and Capacity
    |--------------------------------------------------------------------------
    */

    /**
     * @param  list<array{date: string, time_start: string, time_end: string}>  $occurrences
     * @return array{restrictions: list<string>, warning: string|null}
     */
    private function gymAvailability(Request $request, Venue $venue, array $occurrences): array
    {
        $policy = app(GymUsagePolicy::class);

        if (!$policy->appliesTo($venue)) {
            return ['restrictions' => [], 'warning' => null];
        }

        $authorized = $request->boolean('university_wide_activity')
            && $request->user()?->allows(Permission::EVENT_BOOKINGS_DESIGNATE_UNIVERSITY_WIDE);

        return [
            'restrictions' => $authorized ? [] : $policy->violations($occurrences),
            'warning' => $policy->reservationWarning($request->input('reservation_span')),
        ];
    }

    private function emergencyBypassRequested(Request $request): bool
    {
        $header = strtolower((string) $request->header('X-Emergency-Bypass', ''));

        if (in_array($header, ['1', 'true', 'yes'], true)) {
            return true;
        }

        return filter_var($request->input('emergency_bypass'), FILTER_VALIDATE_BOOLEAN);
    }

    private function assertCanSubmitBooking(Request $request, Venue $venue, array $validated): void
    {
        $actor = $request->user();
        $canCreate = $actor->allows(Permission::EVENT_BOOKINGS_CREATE);

        if (!$canCreate && $this->emergencyBypassRequested($request)) {
            $canCreate = $actor->allowsWithEmergencyBypass(Permission::EVENT_BOOKINGS_CREATE);
        }

        if ($canCreate) {
            return;
        }

        $designated = (bool) ($validated['university_wide_activity'] ?? false)
            && $actor->allows(Permission::EVENT_BOOKINGS_DESIGNATE_UNIVERSITY_WIDE)
            && app(GymUsagePolicy::class)->appliesTo($venue);

        if (!$designated) {
            abort(403, 'You are not allowed to submit this booking.');
        }
    }

    /**
     * @param  list<array{date: string, time_start: string, time_end: string}>  $occurrences
     * @return array{fields: array<string, mixed>, warning: string|null}
     */
    private function gymBookingFields(Request $request, Venue $venue, array $validated, array $occurrences): array
    {
        $policy = app(GymUsagePolicy::class);
        $empty = [
            'university_wide_activity' => false,
            'university_wide_designated_by' => null,
            'university_wide_designated_at' => null,
            'reservation_span' => null,
            'gym_responsibilities_acknowledged' => false,
            'gym_responsibilities_acknowledged_at' => null,
            'gym_responsibilities_acknowledged_by' => null,
            'gym_responsibility_statement' => null,
        ];

        if (!$policy->appliesTo($venue)) {
            if (!empty($validated['university_wide_activity'])) {
                throw ValidationException::withMessages([
                    'university_wide_activity' => [
                        'A University-wide activity exception applies only to FCU Gym.',
                    ],
                ]);
            }

            return ['fields' => $empty, 'warning' => null];
        }

        $actor = $request->user();
        $designated = (bool) ($validated['university_wide_activity'] ?? false);

        if ($designated && !$actor->allows(Permission::EVENT_BOOKINGS_DESIGNATE_UNIVERSITY_WIDE)) {
            throw ValidationException::withMessages([
                'university_wide_activity' => [
                    'Only authorized personnel may designate a University-wide activity.',
                ],
            ]);
        }

        if (!$designated) {
            $violations = $policy->violations($occurrences);

            if ($violations !== []) {
                throw ValidationException::withMessages([
                    'time_start' => $violations,
                ]);
            }
        }

        $acknowledged = (bool) ($validated['gym_responsibilities_acknowledged'] ?? false);

        if (!$acknowledged) {
            throw ValidationException::withMessages([
                'gym_responsibilities_acknowledged' => [
                    'Acknowledge the Gym responsibilities before submitting.',
                ],
            ]);
        }

        $span = $validated['reservation_span'] ?? 'standard';

        return [
            'warning' => $policy->reservationWarning($span),
            'fields' => [
                'university_wide_activity' => $designated,
                'university_wide_designated_by' => $designated ? $actor->user_id : null,
                'university_wide_designated_at' => $designated ? now() : null,
                'reservation_span' => in_array($span, ['whole_semester', 'whole_summer'], true) ? $span : null,
                'gym_responsibilities_acknowledged' => true,
                'gym_responsibilities_acknowledged_at' => now(),
                'gym_responsibilities_acknowledged_by' => $actor->user_id,
                'gym_responsibility_statement' => GymUsagePolicy::RESPONSIBILITY_STATEMENT,
            ],
        ];
    }

    private function assertVenueBookable(Venue $venue, array $validated): void
    {
        if ($venue->status !== 'available') {
            throw ValidationException::withMessages([
                'venue_id' => ['This venue is currently unavailable.'],
            ]);
        }

        $attendees = $validated['expected_attendees'] ?? 0;

        if ($attendees > $venue->capacity) {
            throw ValidationException::withMessages([
                'expected_attendees' => [
                    "This venue's capacity is {$venue->capacity} persons.",
                ],
            ]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Requested Resources Must Fit the Venue's Inventory
    |--------------------------------------------------------------------------
    */

    private function assertResourcesBookable(Venue $venue, array $resources): void
    {
        $venueResources = $venue->resources()->get()->keyBy('resource_id');

        $seen = [];

        foreach ($resources as $index => $resource) {
            $resourceId = isset($resource['resource_id'])
                ? (int) $resource['resource_id']
                : null;

            // "Other equipment" has no inventory to check
            if ($resourceId === null) {
                continue;
            }

            if (in_array($resourceId, $seen, true)) {
                throw ValidationException::withMessages([
                    "resources.{$index}.resource_id" => [
                        'A resource can only be added once.',
                    ],
                ]);
            }

            $seen[] = $resourceId;

            $venueResource = $venueResources->get($resourceId);

            if (! $venueResource) {
                throw ValidationException::withMessages([
                    "resources.{$index}.resource_id" => [
                        'This resource does not belong to the selected venue.',
                    ],
                ]);
            }

            if ($venueResource->condition === 'damaged') {
                throw ValidationException::withMessages([
                    "resources.{$index}.resource_id" => [
                        "{$venueResource->resource_name} is damaged and cannot be requested.",
                    ],
                ]);
            }

            // NULL total_quantity = quantity not confirmed, so there is no limit to enforce
            if (
                $venueResource->total_quantity !== null &&
                (int) $resource['quantity'] > $venueResource->total_quantity
            ) {
                throw ValidationException::withMessages([
                    "resources.{$index}.quantity" => [
                        "Only {$venueResource->total_quantity} {$venueResource->resource_name} available at this venue.",
                    ],
                ]);
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Save Requested Resources
    |--------------------------------------------------------------------------
    */

    private function syncResources(
        EventBooking $eventBooking,
        Venue $venue,
        array $resources
    ): void {
        $venueResources = $venue->resources()->get()->keyBy('resource_id');

        $eventBooking->resources()->delete();

        foreach ($resources as $resource) {
            $resourceId = isset($resource['resource_id'])
                ? (int) $resource['resource_id']
                : null;

            $eventBooking->resources()->create([
                'resource_id' => $resourceId,

                // Linked resources take the name from the venue, not from the client
                'resource_name' => $resourceId !== null
                    ? $venueResources[$resourceId]->resource_name
                    : $resource['resource_name'],

                'quantity' => (int) $resource['quantity'],
                'notes' => $resource['notes'] ?? null,
            ]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Save Schedule (one row per date, each with its own time)
    |--------------------------------------------------------------------------
    */

    private function syncSchedules(EventBooking $eventBooking, array $occurrences): void
    {
        $eventBooking->schedules()->delete();

        $now = now();

        EventBookingSchedule::insert(array_map(fn ($o) => [
            'event_booking_id' => $eventBooking->event_booking_id,
            'venue_id' => $eventBooking->venue_id,
            'schedule_date' => $o['date'],
            'time_start' => $o['time_start'],
            'time_end' => $o['time_end'],
            'created_at' => $now,
            'updated_at' => $now,
        ], $occurrences));
    }

    /*
    |--------------------------------------------------------------------------
    | Venue Schedule Conflict Check (for an already-saved booking)
    |--------------------------------------------------------------------------
    */

    private function assertNoConflict(EventBooking $eventBooking): void
    {
        $this->assertMaintenanceClear(
            $eventBooking->venue_id,
            $eventBooking->occurrences(),
        );

        app(VenueConflictChecker::class)->assertAvailable(
            $eventBooking->venue_id,
            $eventBooking->occurrences(),
            $eventBooking->event_booking_id,
        );
    }

    /**
     * @param  list<array{date: string, time_start: string, time_end: string}>  $occurrences
     * @param  list<string>  $gymRestrictions
     * @return list<string>
     */
    private function scheduleRestrictions(Venue $venue, array $occurrences, array $gymRestrictions): array
    {
        $messages = array_merge(
            $gymRestrictions,
            app(BookingHoursPolicy::class)->violations($venue, $occurrences),
        );

        $maintenance = VenueMaintenance::blocking(
            $venue->venue_id,
            array_column($occurrences, 'date'),
        );

        if ($maintenance) {
            $messages[] = $maintenance->bookingMessage();
        }

        return array_values($messages);
    }

    /**
     * @param  list<array{date: string, time_start: string, time_end: string}>  $occurrences
     */
    private function assertBookingHours(Venue $venue, array $occurrences): void
    {
        $violations = app(BookingHoursPolicy::class)->violations($venue, $occurrences);

        if ($violations !== []) {
            throw ValidationException::withMessages([
                'time_start' => $violations,
            ]);
        }
    }

    /**
     * @param  list<array{date: string, time_start: string, time_end: string}>  $occurrences
     */
    private function assertMaintenanceClear(int $venueId, array $occurrences): void
    {
        $maintenance = VenueMaintenance::blocking(
            $venueId,
            array_column($occurrences, 'date'),
        );

        if ($maintenance) {
            throw ValidationException::withMessages([
                'venue_id' => [$maintenance->bookingMessage()],
            ]);
        }
    }
}