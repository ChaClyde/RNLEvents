<?php

namespace App\Scheduling;

use Carbon\Carbon;

final class AdvanceBookingPolicy
{
    public const MINIMUM_DAYS = 2;

    public const MESSAGE = 'Book at least 2 days before the event. Same-day and next-day bookings are not allowed.';

    public function earliestDate(?Carbon $today = null): string
    {
        return ($today ?? Carbon::today())->startOfDay()
            ->addDays(self::MINIMUM_DAYS)
            ->toDateString();
    }

    /**
     * @param  list<array{date: string, time_start?: string, time_end?: string}>  $occurrences
     * @return list<string>
     */
    public function violations(array $occurrences): array
    {
        $earliest = $this->earliestDate();
        $messages = [];

        foreach ($occurrences as $occurrence) {
            $date = substr((string) $occurrence['date'], 0, 10);

            if ($date < $earliest) {
                $messages[] = Carbon::parse($date)->format('D, M j, Y').' is too soon. '.self::MESSAGE;
            }
        }

        if (count($messages) <= 3) {
            return $messages;
        }

        $extra = count($messages) - 3;

        return array_merge(array_slice($messages, 0, 3), [
            "and {$extra} more date(s) are inside the 2-day advance period.",
        ]);
    }
}
