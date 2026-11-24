<?php

namespace App\Scheduling;

use App\Models\Venue;
use Carbon\Carbon;

final class BookingHoursPolicy
{
    public const OPEN = '07:00';

    public const CLOSE = '22:00';

    /**
     * FCU Gym keeps its own confirmed windows, including 6:00 AM openings.
     *
     * @param  list<array{date: string, time_start: string, time_end: string}>  $occurrences
     * @return list<string>
     */
    public function violations(Venue $venue, array $occurrences): array
    {
        if (app(GymUsagePolicy::class)->appliesTo($venue)) {
            return [];
        }

        $messages = [];

        foreach ($occurrences as $occurrence) {
            $start = substr((string) $occurrence['time_start'], 0, 5);
            $end = substr((string) $occurrence['time_end'], 0, 5);

            if ($start < self::OPEN || $end > self::CLOSE) {
                $messages[] = Carbon::parse($occurrence['date'])->format('D, M j, Y')
                    .' is outside the allowed booking time. Bookings are only allowed from 7:00 AM to 10:00 PM.';
            }
        }

        if (count($messages) <= 3) {
            return $messages;
        }

        $extra = count($messages) - 3;

        return array_merge(array_slice($messages, 0, 3), [
            "and {$extra} more date(s) are outside 7:00 AM to 10:00 PM.",
        ]);
    }
}
