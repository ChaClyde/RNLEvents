<?php

namespace App\Venues;

use App\Models\VenueRate;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

final class VenueFeeCalculator
{
    public const REGULAR_START = '08:00';

    public const REGULAR_END = '17:00';

    /**
     * @param  list<array{date: string, time_start: string, time_end: string}>  $occurrences
     * @param  list<array<string, mixed>>  $resources
     * @return array<string, mixed>
     */
    public function quote(int $venueId, array $occurrences, array $resources): array
    {
        $lines = [];
        $versions = [];
        $ratesUsed = [];
        $missingDates = [];
        $sort = 0;

        foreach ($occurrences as $occurrence) {
            $date = Carbon::parse($occurrence['date'])->toDateString();
            $rate = $this->rateFor($venueId, $date);

            if ($rate === null) {
                $missingDates[] = $date;
                continue;
            }

            $ratesUsed[$rate->venue_rate_id] = $rate;
            $versions[$rate->venue_rate_id] = $this->versionPayload($rate);

            $minutes = $this->minutes($occurrence['time_start'], $occurrence['time_end']);
            [$regularMinutes, $extraMinutes] = $this->splitMinutes(
                $date,
                $occurrence['time_start'],
                $occurrence['time_end'],
                $rate->included_hours === null ? null : (float) $rate->included_hours,
            );
            $weekend = Carbon::parse($date)->isWeekend();

            if ($rate->pricing_basis === 'hourly') {
                if ($regularMinutes > 0) {
                    $lines[] = $this->line(
                        $date,
                        'venue',
                        'Base facility rental',
                        $this->hours($regularMinutes),
                        'hour',
                        $rate->hourly_rate,
                        $sort++
                    );
                }
            } elseif (!$weekend) {
                $lines[] = $this->line(
                    $date,
                    'venue',
                    'Base facility rental',
                    '1.00',
                    'day',
                    $rate->daily_rate,
                    $sort++
                );
            }

            if ($extraMinutes > 0) {
                $lines[] = $this->line(
                    $date,
                    'overtime',
                    'Overtime',
                    $this->hours($extraMinutes),
                    'hour',
                    $rate->overtime_rate,
                    $sort++
                );
            }

            foreach ($rate->charges as $charge) {
                if (!$charge->is_active || $charge->unit === 'per_booking') {
                    continue;
                }

                $quantity = $this->quantityFor($charge->venue_resource_id, $resources);

                if ($quantity === null) {
                    continue;
                }

                if ($charge->unit === 'per_overtime_hour' && $extraMinutes <= 0) {
                    continue;
                }

                $hourQuantity = $charge->unit === 'per_overtime_hour'
                    ? (float) $this->hours($extraMinutes)
                    : (float) $this->hours($minutes);

                $unitQuantity = in_array($charge->unit, ['per_hour', 'per_overtime_hour'], true)
                    ? $this->money($hourQuantity * $quantity)
                    : $this->money($quantity);

                $lines[] = $this->line(
                    $date,
                    $this->chargeLineType($charge->charge_type),
                    $charge->charge_name,
                    $unitQuantity,
                    in_array($charge->unit, ['per_hour', 'per_overtime_hour'], true) ? 'hour' : 'day',
                    $charge->amount,
                    $sort++
                );
            }
        }

        foreach ($ratesUsed as $rate) {
            foreach ($rate->charges as $charge) {
                if (!$charge->is_active || $charge->unit !== 'per_booking') {
                    continue;
                }

                $quantity = $this->quantityFor($charge->venue_resource_id, $resources);

                if ($quantity === null) {
                    continue;
                }

                $lines[] = $this->line(
                    null,
                    $this->chargeLineType($charge->charge_type),
                    $charge->charge_name,
                    $this->money($quantity),
                    'booking',
                    $charge->amount,
                    $sort++
                );
            }
        }

        if ($versions === []) {
            return $this->emptyQuote(
                'No applicable venue rate was configured when this booking was submitted.'
            );
        }

        $note = 'Calculated from the venue rate in effect on each booked date.';

        if ($missingDates !== []) {
            $note .= ' No applicable rate was configured for '
                .implode(', ', $missingDates)
                .'. Those dates were not charged.';
        }

        return [
            'has_rate' => true,
            'venue_rate_id' => array_key_first($versions),
            'pricing_basis' => count($versions) === 1
                ? $ratesUsed[array_key_first($versions)]->pricing_basis
                : 'mixed',
            'venue_amount' => $this->sum($lines, 'venue'),
            'overtime_amount' => $this->sum($lines, 'overtime'),
            'facility_amount' => $this->sum($lines, 'facility'),
            'equipment_amount' => $this->sum($lines, 'equipment'),
            'service_amount' => $this->sum($lines, 'service'),
            'additional_amount' => $this->sum($lines, ['facility', 'equipment', 'service', 'additional']),
            'total_amount' => $this->sum($lines, null),
            'calculation_note' => $note,
            'rate_versions' => array_values($versions),
            'lines' => $lines,
        ];
    }

    private function rateFor(int $venueId, string $date): ?VenueRate
    {
        return VenueRate::query()
            ->with('charges')
            ->where('venue_id', $venueId)
            ->where('is_active', true)
            ->whereDate('effective_from', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('effective_to')
                    ->orWhereDate('effective_to', '>=', $date);
            })
            ->orderByDesc('effective_from')
            ->orderByDesc('venue_rate_id')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function versionPayload(VenueRate $rate): array
    {
        return [
            'venue_rate_id' => $rate->venue_rate_id,
            'pricing_basis' => $rate->pricing_basis,
            'hourly_rate' => $rate->hourly_rate,
            'daily_rate' => $rate->daily_rate,
            'overtime_rate' => $rate->overtime_rate,
            'included_hours' => $rate->included_hours,
            'effective_from' => $rate->effective_from?->toDateString(),
            'effective_to' => $rate->effective_to?->toDateString(),
            'charges' => $rate->charges->map(fn ($charge) => [
                'charge_name' => $charge->charge_name,
                'charge_type' => $charge->charge_type,
                'amount' => $charge->amount,
                'unit' => $charge->unit,
                'venue_resource_id' => $charge->venue_resource_id,
                'is_active' => $charge->is_active,
            ])->values()->all(),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $resources
     */
    private function quantityFor(?int $resourceId, array $resources): ?int
    {
        if ($resourceId === null) {
            return 1;
        }

        foreach ($resources as $resource) {
            if ((int) ($resource['resource_id'] ?? 0) === $resourceId) {
                return max(1, (int) ($resource['quantity'] ?? 1));
            }
        }

        return null;
    }

    /**
     * Monday to Friday, 8:00 AM to 5:00 PM is regular time. Saturday, Sunday,
     * and any time before 8:00 AM or from 5:00 PM onward are overtime.
     * A stored included-hours cap still limits the weekday regular window.
     *
     * @return array{0: int, 1: int}
     */
    private function splitMinutes(string $date, string $start, string $end, ?float $includedHours): array
    {
        $total = $this->minutes($start, $end);

        if (Carbon::parse($date)->isWeekend()) {
            return [0, $total];
        }

        $inside = $this->overlapMinutes($start, $end, self::REGULAR_START, self::REGULAR_END);
        $outside = $total - $inside;

        if ($includedHours === null) {
            return [$inside, $outside];
        }

        $cap = (int) round($includedHours * 60);
        $regular = min($inside, $cap);

        return [$regular, ($inside - $regular) + $outside];
    }

    private function overlapMinutes(string $start, string $end, string $windowStart, string $windowEnd): int
    {
        $from = max($this->clockMinutes($start), $this->clockMinutes($windowStart));
        $to = min($this->clockMinutes($end), $this->clockMinutes($windowEnd));

        return max(0, $to - $from);
    }

    private function clockMinutes(string $time): int
    {
        $parsed = Carbon::parse($time);

        return ($parsed->hour * 60) + $parsed->minute;
    }

    private function minutes(string $start, string $end): int
    {
        $startAt = Carbon::parse($start);
        $endAt = Carbon::parse($end);
        $minutes = ($endAt->hour * 60 + $endAt->minute) - ($startAt->hour * 60 + $startAt->minute);

        if ($minutes <= 0) {
            throw ValidationException::withMessages([
                'time_end' => ['Each schedule must end after it starts.'],
            ]);
        }

        return $minutes;
    }

    private function hours(int $minutes): string
    {
        return $this->money($minutes / 60);
    }

    /**
     * @return array<string, mixed>
     */
    private function line(
        ?string $date,
        string $type,
        string $label,
        string $quantity,
        string $unit,
        mixed $unitAmount,
        int $sort
    ): array {
        $cents = (int) round(((float) $quantity) * ((float) $unitAmount) * 100);

        return [
            'schedule_date' => $date,
            'line_type' => $type,
            'label' => $label,
            'quantity' => $quantity,
            'unit' => $unit,
            'unit_amount' => $this->money($unitAmount),
            'line_amount' => $this->money($cents / 100),
            'sort_order' => $sort,
        ];
    }

    private function chargeLineType(?string $chargeType): string
    {
        return match ($chargeType) {
            'equipment' => 'equipment',
            'service' => 'service',
            default => 'facility',
        };
    }

    /**
     * @param  string|list<string>|null  $type
     */
    private function sum(array $lines, string|array|null $type): string
    {
        $types = $type === null ? null : (array) $type;
        $cents = 0;

        foreach ($lines as $line) {
            if ($types !== null && !in_array($line['line_type'], $types, true)) {
                continue;
            }

            $cents += (int) round(((float) $line['line_amount']) * 100);
        }

        return $this->money($cents / 100);
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyQuote(string $note): array
    {
        return [
            'has_rate' => false,
            'venue_rate_id' => null,
            'pricing_basis' => null,
            'venue_amount' => null,
            'overtime_amount' => null,
            'facility_amount' => null,
            'equipment_amount' => null,
            'service_amount' => null,
            'additional_amount' => null,
            'total_amount' => null,
            'calculation_note' => $note,
            'rate_versions' => [],
            'lines' => [],
        ];
    }

    private function money(mixed $amount): string
    {
        return number_format(round((float) $amount, 2), 2, '.', '');
    }
}
