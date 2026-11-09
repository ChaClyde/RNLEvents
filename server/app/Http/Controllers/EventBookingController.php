<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventBooking;
use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EventBookingController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Allowed Status Changes
    |--------------------------------------------------------------------------
    */

    private const STATUS_TRANSITIONS = [
        'pending'   => ['approved', 'rejected', 'cancelled'],
        'approved'  => ['cancelled'],
        'rejected'  => [],
        'cancelled' => [],
    ];

    private function bookingRelations(): array
    {
        return ['venue', 'office', 'resources'];
    }

    /*
    |--------------------------------------------------------------------------
    | Load Event Bookings
    |--------------------------------------------------------------------------
    */

    public function loadEventBookings(Request $request)
    {
        $query = EventBooking::with([
            'venue:venue_id,venue,location,capacity,status,venue_image,updated_at',
            'office:office_id,office_name,office_code',
            'resources',
        ])->where('is_deleted', false);

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
                    })
                    ->orWhereHas('resources', function ($resource) use ($search) {
                        $resource->where('resource_name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->venue_id);
        }

        if ($request->filled('office_id')) {
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
    | Store Event Booking
    |--------------------------------------------------------------------------
    */

    public function storeEventBooking(Request $request)
    {
        $validated = $this->validateBooking($request);

        $eventBooking = DB::transaction(function () use ($validated) {

            // Lock the venue row so two requests cannot book the same slot
            $venue = Venue::where('venue_id', $validated['venue_id'])
                ->where('is_deleted', false)
                ->lockForUpdate()
                ->firstOrFail();

            $resources = $validated['resources'] ?? [];

            $this->assertVenueBookable($venue, $validated);
            $this->assertResourcesBookable($venue, $resources);

            $this->checkVenueConflict(
                $validated['venue_id'],
                $validated['date_start'],
                $validated['date_end'],
                $validated['time_start'],
                $validated['time_end']
            );

            $data = $this->prepareBookingData($validated);

            $data['status'] = 'pending';
            $data['approval_stage'] = 'office_head';

            $eventBooking = EventBooking::create($data);

            $this->syncResources($eventBooking, $venue, $resources);

            return $eventBooking;
        });

        return response()->json([
            'message' => 'Event booking request submitted successfully.',
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
        // Read first so validation can tell whether the start date changed
        $existing = EventBooking::where('is_deleted', false)
            ->findOrFail($event_booking_id);

        $validated = $this->validateBooking($request, $existing);

        $eventBooking = DB::transaction(function () use ($validated, $event_booking_id) {

            // Lock order: venue first, then booking (same as every other method)
            $venue = Venue::where('venue_id', $validated['venue_id'])
                ->where('is_deleted', false)
                ->lockForUpdate()
                ->firstOrFail();

            $eventBooking = EventBooking::where('is_deleted', false)
                ->lockForUpdate()
                ->findOrFail($event_booking_id);

            if ($eventBooking->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => ['Only pending event bookings can be updated.'],
                ]);
            }

            $resources = $validated['resources'] ?? [];

            $this->assertVenueBookable($venue, $validated);
            $this->assertResourcesBookable($venue, $resources);

            // Exclude the current booking from the conflict check
            $this->checkVenueConflict(
                $validated['venue_id'],
                $validated['date_start'],
                $validated['date_end'],
                $validated['time_start'],
                $validated['time_end'],
                $eventBooking->event_booking_id
            );

            $eventBooking->update($this->prepareBookingData($validated));

            // The submitted list replaces the previous one
            $this->syncResources($eventBooking, $venue, $resources);

            return $eventBooking;
        });

        return response()->json([
            'message' => 'Event booking updated successfully.',
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

    public function restoreEventBooking($event_booking_id)
    {
        $eventBooking = DB::transaction(function () use ($event_booking_id) {

            // Lock order: venue first, then booking
            $venueId = EventBooking::where('is_deleted', true)
                ->findOrFail($event_booking_id)
                ->venue_id;

            Venue::where('venue_id', $venueId)
                ->lockForUpdate()
                ->first();

            $eventBooking = EventBooking::where('is_deleted', true)
                ->lockForUpdate()
                ->findOrFail($event_booking_id);

            // Only pending/approved bookings hold the venue schedule
            if (in_array($eventBooking->status, ['pending', 'approved'], true)) {
                $this->checkVenueConflict(
                    $eventBooking->venue_id,
                    $eventBooking->date_start->toDateString(),
                    $eventBooking->date_end->toDateString(),
                    $eventBooking->time_start,
                    $eventBooking->time_end,
                    $eventBooking->event_booking_id
                );
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

        // Booking resources are removed automatically (cascadeOnDelete)
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

    public function updateEventBookingStatus(Request $request, $event_booking_id)
    {
        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['approved', 'rejected', 'cancelled']),
            ],

            'approval_stage' => ['nullable', 'string', 'max:100'],

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

        $eventBooking = DB::transaction(function () use ($validated, $event_booking_id) {

            // Lock order: venue first, then booking
            $venueId = EventBooking::where('is_deleted', false)
                ->findOrFail($event_booking_id)
                ->venue_id;

            Venue::where('venue_id', $venueId)
                ->lockForUpdate()
                ->first();

            $eventBooking = EventBooking::where('is_deleted', false)
                ->lockForUpdate()
                ->findOrFail($event_booking_id);

            $allowed = self::STATUS_TRANSITIONS[$eventBooking->status] ?? [];

            if (! in_array($validated['status'], $allowed, true)) {
                throw ValidationException::withMessages([
                    'status' => [
                        "A {$eventBooking->status} booking cannot be changed to {$validated['status']}.",
                    ],
                ]);
            }

            // Recheck the schedule before approving
            if ($validated['status'] === 'approved') {
                $this->checkVenueConflict(
                    $eventBooking->venue_id,
                    $eventBooking->date_start->toDateString(),
                    $eventBooking->date_end->toDateString(),
                    $eventBooking->time_start,
                    $eventBooking->time_end,
                    $eventBooking->event_booking_id
                );
            }

            // Keep existing remarks/reasons unless new values are supplied
            $eventBooking->update([
                'status' => $validated['status'],

                'approval_stage' => $validated['approval_stage']
                    ?? $eventBooking->approval_stage,

                'approval_remarks' => $validated['approval_remarks']
                    ?? $eventBooking->approval_remarks,

                'cancellation_reason' => $validated['cancellation_reason']
                    ?? $eventBooking->cancellation_reason,
            ]);

            return $eventBooking;
        });

        return response()->json([
            'message' => 'Event booking status updated successfully.',
            'data' => $eventBooking->fresh()->load($this->bookingRelations()),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Booking Data
    |--------------------------------------------------------------------------
    |
    | $existing is passed on update. The "not in the past" rule is applied to
    | the start date only when it changes, so a pending booking that has
    | already started can still have its other details edited.
    |
    */

    private function validateBooking(
        Request $request,
        ?EventBooking $existing = null
    ): array {
        $dateStartRules = ['required', 'date'];

        $keepsStartDate = $existing !== null
            && $request->input('date_start') === $existing->date_start->toDateString();

        if (! $keepsStartDate) {
            $dateStartRules[] = 'after_or_equal:today';
        }

        return $request->validate([
            'venue_id' => [
                'required',
                'integer',
                Rule::exists('tbl_venues', 'venue_id')
                    ->where('is_deleted', false),
            ],

            'purpose' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],

            'date_start' => $dateStartRules,
            'date_end' => ['required', 'date', 'after_or_equal:date_start'],

            'time_start' => ['required', 'date_format:H:i'],
            'time_end' => ['required', 'date_format:H:i', 'after:time_start'],

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

            // Only active, non-deleted offices can make a request
            'office_id' => [
                'required',
                'integer',
                Rule::exists('tbl_offices', 'office_id')
                    ->where('is_deleted', false)
                    ->where('status', 'active'),
            ],

            'email' => ['required', 'email', 'max:150'],
            'tel_number' => ['required', 'string', 'max:30'],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Prepare Booking Data (defaults + computed fields)
    |--------------------------------------------------------------------------
    */

    private function prepareBookingData(array $validated): array
    {
        // Resources are saved separately in syncResources()
        unset($validated['resources']);

        $validated['number_of_days'] = (int) Carbon::parse($validated['date_start'])
            ->startOfDay()
            ->diffInDays(Carbon::parse($validated['date_end'])->startOfDay()) + 1;

        $validated['expected_attendees'] = $validated['expected_attendees'] ?? 0;

        return $validated;
    }

    /*
    |--------------------------------------------------------------------------
    | Venue Availability and Capacity
    |--------------------------------------------------------------------------
    */

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
    | Venue Schedule Conflict Checker
    |--------------------------------------------------------------------------
    */

    private function checkVenueConflict(
        $venue_id,
        $date_start,
        $date_end,
        $time_start,
        $time_end,
        $exclude_event_booking_id = null
    ): void {
        $query = EventBooking::where('venue_id', $venue_id)
            ->where('is_deleted', false)
            ->whereIn('status', ['pending', 'approved'])

            // Overlapping dates
            ->whereDate('date_start', '<=', $date_end)
            ->whereDate('date_end', '>=', $date_start)

            // Overlapping times
            ->whereTime('time_start', '<', $time_end)
            ->whereTime('time_end', '>', $time_start);

        if ($exclude_event_booking_id !== null) {
            $query->where('event_booking_id', '!=', $exclude_event_booking_id);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'venue_id' => [
                    'This venue already has a pending or approved booking during the selected schedule.',
                ],
            ]);
        }
    }
}
