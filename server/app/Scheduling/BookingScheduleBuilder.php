<?php

namespace App\Scheduling;

use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class BookingScheduleBuilder
{
    public const MAX_OCCURRENCES = 200;
    public const MAX_RANGE_DAYS = 366;

    /**
     * @return list<array{date: string, time_start: string, time_end: string}>
     */
    public function build(array $v): array
    {
        $type = $v['schedule_type'] ?? 'range';
        $defaultStart = $v['time_start'];
        $defaultEnd = $v['time_end'];

        // Per-date time changes, keyed by date
        $overrides = [];
        foreach ($v['overrides'] ?? [] as $override) {
            $overrides[Carbon::parse($override['date'])->toDateString()] = [
                'time_start' => $override['time_start'],
                'time_end' => $override['time_end'],
            ];
        }

        $rows = [];

        if ($type === 'custom') {
            foreach ($v['dates'] ?? [] as $item) {
                $date = Carbon::parse($item['date'])->toDateString();

                $rows[$date] = [
                    'date' => $date,
                    'time_start' => $item['time_start']
                        ?? ($overrides[$date]['time_start'] ?? $defaultStart),
                    'time_end' => $item['time_end']
                        ?? ($overrides[$date]['time_end'] ?? $defaultEnd),
                ];
            }
        } else {
            $start = Carbon::parse($v['date_start'])->startOfDay();
            $end = Carbon::parse($v['date_end'])->startOfDay();

            if ($start->diffInDays($end) > self::MAX_RANGE_DAYS) {
                throw ValidationException::withMessages([
                    'date_end' => ['A booking can span at most one year.'],
                ]);
            }

            $excluded = array_flip(array_map(
                fn ($d) => Carbon::parse($d)->toDateString(),
                $v['excluded_dates'] ?? []
            ));

            $weekdays = array_map('intval', $v['weekdays'] ?? []);

            for ($day = $start->copy(); $day->lte($end); $day->addDay()) {
                $date = $day->toDateString();

                if (isset($excluded[$date])) {
                    continue;
                }

                // Carbon: 0 = Sunday ... 6 = Saturday
                if ($type === 'weekly' && ! in_array($day->dayOfWeek, $weekdays, true)) {
                    continue;
                }

                $rows[$date] = [
                    'date' => $date,
                    'time_start' => $overrides[$date]['time_start'] ?? $defaultStart,
                    'time_end' => $overrides[$date]['time_end'] ?? $defaultEnd,
                ];
            }
        }

        if (empty($rows)) {
            throw ValidationException::withMessages([
                'schedule' => ['No dates match the selected schedule.'],
            ]);
        }

        if (count($rows) > self::MAX_OCCURRENCES) {
            throw ValidationException::withMessages([
                'schedule' => ['A booking can have at most ' . self::MAX_OCCURRENCES . ' dates.'],
            ]);
        }

        ksort($rows);

        foreach ($rows as $row) {
            if ($row['time_end'] <= $row['time_start']) {
                throw ValidationException::withMessages([
                    'time_end' => [
                        'End time must be later than start time on ' . $row['date'] . '.',
                    ],
                ]);
            }
        }

        return array_values($rows);
    }
}