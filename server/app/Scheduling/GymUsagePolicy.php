<?php

namespace App\Scheduling;

use App\Models\Venue;
use Carbon\Carbon;

final class GymUsagePolicy
{
    public const RESPONSIBILITY_STATEMENT = 'Maintain cleanliness. Protect facilities and equipment. Negligent damage will be charged to the responsible organization, department, or group.';

    public function appliesTo(Venue $venue): bool
    {
        $name = strtolower(trim($venue->venue));
        $name = preg_replace('/[^a-z0-9]+/', ' ', $name) ?? $name;
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? $name);

        return in_array($name, ['fcu gym', 'gym'], true);
    }

    /**
     * @param  list<array{date: string, time_start: string, time_end: string}>  $occurrences
     * @return list<string>
     */
    public function violations(array $occurrences): array
    {
        $messages = [];

        foreach ($occurrences as $occurrence) {
            $date = Carbon::parse($occurrence['date']);
            $windows = $this->windows($date);

            if ($windows === null) {
                $messages[] = $date->format('D, M j, Y')
                    .' is a Sunday. The FCU Gym schedule does not include Sunday.';
                continue;
            }

            $start = $this->minutes($occurrence['time_start']);
            $end = $this->minutes($occurrence['time_end']);
            $fits = false;

            foreach ($windows as [$windowStart, $windowEnd]) {
                if ($start >= $this->minutes($windowStart) && $end <= $this->minutes($windowEnd)) {
                    $fits = true;
                    break;
                }
            }

            if (!$fits) {
                $messages[] = $date->format('D, M j, Y')
                    .' is outside the permitted Gym schedule ('.$this->describe($windows).').';
            }
        }

        if (count($messages) <= 5) {
            return $messages;
        }

        $extra = count($messages) - 5;

        return array_merge(array_slice($messages, 0, 5), [
            "and {$extra} more date(s) are outside the permitted Gym schedule.",
        ]);
    }

    public function reservationWarning(?string $span): ?string
    {
        return match ($span) {
            'whole_semester' => 'A whole-semester Gym reservation is strongly discouraged. The request can still be submitted.',
            'whole_summer' => 'A whole-summer Gym reservation is strongly discouraged. The request can still be submitted.',
            default => null,
        };
    }

    /**
     * @return list<array{0: string, 1: string}>|null
     */
    private function windows(Carbon $date): ?array
    {
        return match ($date->dayOfWeek) {
            Carbon::MONDAY, Carbon::TUESDAY, Carbon::THURSDAY, Carbon::FRIDAY => [
                ['06:00', '08:00'],
                ['16:00', '18:00'],
            ],
            Carbon::WEDNESDAY, Carbon::SATURDAY => [
                ['06:00', '18:00'],
            ],
            default => null,
        };
    }

    /**
     * @param  list<array{0: string, 1: string}>  $windows
     */
    private function describe(array $windows): string
    {
        return implode(' or ', array_map(
            fn (array $window) => Carbon::parse($window[0])->format('g:i A')
                .'–'.Carbon::parse($window[1])->format('g:i A'),
            $windows
        ));
    }

    private function minutes(string $time): int
    {
        $parts = explode(':', substr($time, 0, 5));

        return ((int) $parts[0] * 60) + (int) ($parts[1] ?? 0);
    }
};
