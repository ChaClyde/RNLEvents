<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventBookingSchedule;
use App\Models\Venue;
use App\Scheduling\TimeFormat;
use App\Scheduling\VenueConflictChecker;
use Carbon\Carbon;
use Illuminate\Http\Request;

class VenueCalendarController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | One month of a venue's schedule
    |--------------------------------------------------------------------------
    */

    public function month(Request $request, $venue_id)
    {
        $validated = $request->validate([
            'month' => ['required', 'date_format:Y-m'],
            'exclude_event_booking_id' => ['nullable', 'integer'],
        ]);

        $venue = $this->findVenue($venue_id);

        // "!" resets the day so months never overflow (e.g. the 31st)
        $start = Carbon::createFromFormat('!Y-m', $validated['month'])->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $rows = $this->schedules(
            $venue->venue_id,
            $start->toDateString(),
            $end->toDateString(),
            $validated['exclude_event_booking_id'] ?? null
        );

        $checker = app(VenueConflictChecker::class);

        $days = $rows
            ->groupBy(fn ($row) => $row->schedule_date->toDateString())
            ->map(function ($group, $date) use ($checker) {
                $slots = $checker->slotsFromBookings(
                    $group->map(fn ($row) => [
                        'time_start' => TimeFormat::hm($row->time_start),
                        'time_end' => TimeFormat::hm($row->time_end),
                    ])->all()
                );

                return [
                    'date' => $date,
                    // No free time left that day = fully booked
                    'status' => empty($slots) ? 'booked' : 'partial',
                    'events_count' => $group->count(),
                    'events' => $group->map(fn ($row) => $this->summary($row))->values(),
                ];
            })
            ->values();

        return response()->json([
            'message' => 'Venue calendar loaded successfully.',
            'data' => [
                'venue' => [
                    'venue_id' => $venue->venue_id,
                    'venue' => $venue->venue,
                    'status' => $venue->status,
                ],
                'month' => $validated['month'],
                'window' => [
                    'start_label' => TimeFormat::label(VenueConflictChecker::OPEN_TIME),
                    'end_label' => TimeFormat::label(VenueConflictChecker::CLOSE_TIME),
                ],
                // Dates that are not listed are fully available
                'days' => $days,
            ],
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | One clicked date: event details + free times
    |--------------------------------------------------------------------------
    */

    public function day(Request $request, $venue_id)
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'exclude_event_booking_id' => ['nullable', 'integer'],
        ]);

        $venue = $this->findVenue($venue_id);
        $date = $validated['date'];

        $rows = $this->schedules(
            $venue->venue_id,
            $date,
            $date,
            $validated['exclude_event_booking_id'] ?? null
        );

        $events = $rows->map(fn ($row) => $this->summary($row) + [
            'description' => $row->booking->description,
            'requested_by' => $row->booking->requested_by,
            'approval_stage' => $row->booking->approval_stage,
            'expected_attendees' => (int) $row->booking->expected_attendees,
            'schedule_type' => $row->booking->schedule_type,
            'booking_date_start' => $row->booking->date_start->toDateString(),
            'booking_date_end' => $row->booking->date_end->toDateString(),
            'number_of_days' => (int) $row->booking->number_of_days,
        ])->values();

        $freeSlots = app(VenueConflictChecker::class)->slotsFromBookings(
            $rows->map(fn ($row) => [
                'time_start' => TimeFormat::hm($row->time_start),
                'time_end' => TimeFormat::hm($row->time_end),
            ])->all()
        );

        return response()->json([
            'message' => 'Venue day loaded successfully.',
            'data' => [
                'date' => $date,
                'day' => Carbon::parse($date)->format('l'),
                'events' => $events,
                'free_slots' => $freeSlots,
            ],
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    private function findVenue($venue_id): Venue
    {
        return Venue::where('venue_id', $venue_id)
            ->where('is_deleted', false)
            ->firstOrFail();
    }

    // Pending/approved bookings only, the same rule the conflict detector uses
    private function schedules(int $venueId, string $from, string $to, ?int $excludeBookingId)
    {
        return EventBookingSchedule::query()
            ->with('booking.office')
            ->where('venue_id', $venueId)
            ->whereBetween('schedule_date', [$from, $to])
            ->whereHas('booking', function ($query) use ($excludeBookingId) {
                $query->where('is_deleted', false)
                    ->whereIn('status', VenueConflictChecker::HOLDING_STATUSES);

                if ($excludeBookingId) {
                    $query->where('event_booking_id', '!=', $excludeBookingId);
                }
            })
            ->orderBy('schedule_date')
            ->orderBy('time_start')
            ->get();
    }

    private function summary(EventBookingSchedule $row): array
    {
        return [
            'event_booking_id' => $row->event_booking_id,
            'purpose' => $row->booking->purpose,
            'status' => $row->booking->status,
            'office' => $row->booking->office?->office_name,
            'time_start_label' => TimeFormat::label($row->time_start),
            'time_end_label' => TimeFormat::label($row->time_end),
        ];
    }
}