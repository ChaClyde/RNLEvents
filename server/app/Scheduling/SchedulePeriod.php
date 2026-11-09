<?php

namespace App\Scheduling;

use Carbon\Carbon;

final class SchedulePeriod
{
    public static function combine(mixed $date, mixed $time): Carbon
    {
        $dateString = $date instanceof Carbon
            ? $date->toDateString()
            : Carbon::parse((string) $date)->toDateString();

        $timeString = is_string($time) ? $time : (string) $time;

        if (strlen($timeString) === 5) {
            $timeString .= ':00';
        }

        return Carbon::parse($dateString . ' ' . $timeString);
    }

    public static function overlaps(Carbon $startA, Carbon $endA, Carbon $startB, Carbon $endB): bool
    {
        return $startA->lt($endB) && $endA->gt($startB);
    }
}
