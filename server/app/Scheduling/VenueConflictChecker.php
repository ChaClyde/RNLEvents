<?php

namespace App\Scheduling;

use App\Models\EventBookingSchedule;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class VenueConflictChecker
{
    // Bookings in these statuses hold the venue
    public const HOLDING_STATUSES = ['pending', 'approved'];

    // Hours the venue can be booked (used for "free times")
    public const OPEN_TIME = '06:00';
    public const CLOSE_TIME = '22:00';

    private const SEARCH_DAYS = 45;
    private const MAX_ALTERNATIVES = 5;
    private const MIN_SLOT_MINUTES = 30;

    /*
    |--------------------------------------------------------------------------
    | Detect
    |--------------------------------------------------------------------------
    */

    public function detect(int $venueId, array $occurrences, ?int $excludeBookingId = null): array
    {
        if (empty($occurrences)) {
            return [];
        }

        $dates = array_column($occurrences, 'date');

        $existing = $this->existingByDate(
            $venueId,
            min($dates),
            max($dates),
            $excludeBookingId
        );

        $conflicts = [];

        foreach ($occurrences as $occurrence) {
            $matches = array_values(array_filter(
                $existing[$occurrence['date']] ?? [],
                fn ($e) => $this->overlaps(
                    $occurrence['time_start'],
                    $occurrence['time_end'],
                    $e['time_start'],
                    $e['time_end']
                )
            ));

            if (empty($matches)) {
                continue;
            }

            $conflicts[] = [
                'date' => $occurrence['date'],
                'requested' => [
                    'time_start' => $occurrence['time_start'],
                    'time_end' => $occurrence['time_end'],
                    'time_start_label' => TimeFormat::label($occurrence['time_start']),
                    'time_end_label' => TimeFormat::label($occurrence['time_end']),
                ],
                'conflicts_with' => array_map(fn ($e) => [
                    'event_booking_id' => $e['event_booking_id'],
                    'purpose' => $e['purpose'],
                    'status' => $e['status'],
                    'office' => $e['office'],
                    'time_start_label' => TimeFormat::label($e['time_start']),
                    'time_end_label' => TimeFormat::label($e['time_end']),
                ], $matches),
            ];
        }

        return $conflicts;
    }

    /*
    |--------------------------------------------------------------------------
    | Assert (used inside the store/update/restore/approve transactions)
    |--------------------------------------------------------------------------
    */

    public function assertAvailable(int $venueId, array $occurrences, ?int $excludeBookingId = null): void
    {
        $conflicts = $this->detect($venueId, $occurrences, $excludeBookingId);

        if (empty($conflicts)) {
            return;
        }

        $lines = [];

        foreach (array_slice($conflicts, 0, 3) as $conflict) {
            $with = $conflict['conflicts_with'][0];

            $lines[] = sprintf(
                '%s (%s - %s is taken by "%s")',
                Carbon::parse($conflict['date'])->format('D, M j, Y'),
                $with['time_start_label'],
                $with['time_end_label'],
                $with['purpose']
            );
        }

        $more = count($conflicts) - count($lines);

        $message = 'The venue is already booked on: ' . implode('; ', $lines)
            . ($more > 0 ? " and {$more} more date(s)." : '.');

        throw ValidationException::withMessages([
            'venue_id' => [$message],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Suggest (free times that day + nearest fully free dates)
    |--------------------------------------------------------------------------
    */

    public function suggest(
        int $venueId,
        array $occurrences,
        array $conflicts,
        ?int $excludeBookingId = null
    ): array {
        if (empty($conflicts)) {
            return [];
        }

        $taken = array_flip(array_column($occurrences, 'date'));
        $conflictDates = array_column($conflicts, 'date');

        $today = Carbon::today();

        $from = Carbon::parse(min($conflictDates))->subDays(self::SEARCH_DAYS);
        if ($from->lt($today)) {
            $from = $today->copy();
        }

        $to = Carbon::parse(max($conflictDates))->addDays(self::SEARCH_DAYS);

        $existing = $this->existingByDate(
            $venueId,
            $from->toDateString(),
            $to->toDateString(),
            $excludeBookingId
        );

        $suggestions = [];

        foreach ($conflicts as $conflict) {
            $center = Carbon::parse($conflict['date']);
            $start = $conflict['requested']['time_start'];
            $end = $conflict['requested']['time_end'];

            $alternatives = [];

            for ($offset = 1; $offset <= self::SEARCH_DAYS; $offset++) {
                foreach ([1, -1] as $direction) {
                    $candidate = $center->copy()->addDays($offset * $direction);
                    $date = $candidate->toDateString();

                    if ($candidate->lt($today) || isset($taken[$date])) {
                        continue;
                    }

                    $isFree = collect($existing[$date] ?? [])->every(
                        fn ($e) => ! $this->overlaps($start, $end, $e['time_start'], $e['time_end'])
                    );

                    if (! $isFree) {
                        continue;
                    }

                    $alternatives[] = [
                        'date' => $date,
                        'day' => $candidate->format('l'),
                        'time_start_label' => TimeFormat::label($start),
                        'time_end_label' => TimeFormat::label($end),
                    ];

                    if (count($alternatives) >= self::MAX_ALTERNATIVES) {
                        break 2;
                    }
                }
            }

            $suggestions[] = [
                'conflict_date' => $conflict['date'],
                'free_slots_that_day' => $this->slotsFromBookings($existing[$conflict['date']] ?? []),
                'alternative_dates' => $alternatives,
            ];
        }

        return $suggestions;
    }

    /*
    |--------------------------------------------------------------------------
    | Free times for one date (reusable for the venue calendar)
    |--------------------------------------------------------------------------
    */

    public function freeSlots(int $venueId, string $date, ?int $excludeBookingId = null): array
    {
        $existing = $this->existingByDate($venueId, $date, $date, $excludeBookingId);

        return $this->slotsFromBookings($existing[$date] ?? []);
    }

    /*
    |--------------------------------------------------------------------------
    | Internals
    |--------------------------------------------------------------------------
    */

    /**
     * Existing pending/approved bookings for a venue, keyed by date.
     *
     * @return array<string, list<array>>
     */
    private function existingByDate(int $venueId, string $from, string $to, ?int $excludeBookingId): array
    {
        $rows = EventBookingSchedule::query()
            ->with('booking.office')
            ->where('venue_id', $venueId)
            ->whereBetween('schedule_date', [$from, $to])
            ->whereHas('booking', function ($query) use ($excludeBookingId) {
                $query->where('is_deleted', false)
                    ->whereIn('status', self::HOLDING_STATUSES);

                if ($excludeBookingId) {
                    $query->where('event_booking_id', '!=', $excludeBookingId);
                }
            })
            ->orderBy('time_start')
            ->get();

        $map = [];

        foreach ($rows as $row) {
            $map[$row->schedule_date->toDateString()][] = [
                'event_booking_id' => $row->event_booking_id,
                'purpose' => $row->booking->purpose,
                'status' => $row->booking->status,
                'office' => $row->booking->office?->office_name,
                'time_start' => TimeFormat::hm($row->time_start),
                'time_end' => TimeFormat::hm($row->time_end),
            ];
        }

        return $map;
    }

    private function overlaps(string $aStart, string $aEnd, string $bStart, string $bEnd): bool
    {
        return $aStart < $bEnd && $aEnd > $bStart;
    }

    /** Open hours minus the booked times, as a list of free slots. */
    public function slotsFromBookings(array $bookings): array
    {
        usort($bookings, fn ($a, $b) => strcmp($a['time_start'], $b['time_start']));

        $slots = [];
        $cursor = self::OPEN_TIME;

        foreach ($bookings as $booking) {
            $slotEnd = min($booking['time_start'], self::CLOSE_TIME);

            if ($cursor < $slotEnd) {
                $slots[] = [$cursor, $slotEnd];
            }

            if ($booking['time_end'] > $cursor) {
                $cursor = $booking['time_end'];
            }
        }

        if ($cursor < self::CLOSE_TIME) {
            $slots[] = [$cursor, self::CLOSE_TIME];
        }

        $result = [];

        foreach ($slots as [$start, $end]) {
            if ($this->minutes($end) - $this->minutes($start) < self::MIN_SLOT_MINUTES) {
                continue;
            }

            $result[] = [
                'time_start' => $start,
                'time_end' => $end,
                'time_start_label' => TimeFormat::label($start),
                'time_end_label' => TimeFormat::label($end),
            ];
        }

        return $result;
    }

    private function minutes(string $time): int
    {
        [$hour, $minute] = array_map('intval', explode(':', $time));

        return $hour * 60 + $minute;
    }
}