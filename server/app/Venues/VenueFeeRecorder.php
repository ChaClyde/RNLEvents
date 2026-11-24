<?php

namespace App\Venues;

use App\Models\EventBooking;
use App\Models\EventBookingFeeRate;
use App\Models\EventBookingFeeSnapshot;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final class VenueFeeRecorder
{
    public function __construct(private readonly VenueFeeCalculator $calculator)
    {
    }

    /**
     * @param  list<array{date: string, time_start: string, time_end: string}>  $occurrences
     * @param  list<array<string, mixed>>  $resources
     */
    public function store(EventBooking $booking, array $occurrences, array $resources): void
    {
        $quote = $this->calculator->quote($booking->venue_id, $occurrences, $resources);

        $booking->feeSnapshot()->first()?->delete();

        $snapshot = $booking->feeSnapshot()->create([
            'venue_rate_id' => $quote['venue_rate_id'],
            'pricing_basis' => $quote['pricing_basis'],
            'venue_amount' => $quote['venue_amount'],
            'overtime_amount' => $quote['overtime_amount'],
            'additional_amount' => $quote['additional_amount'],
            'total_amount' => $quote['total_amount'],
            'calculation_note' => $quote['calculation_note'],
            'rate_snapshot' => $quote['rate_versions'],
            'calculated_at' => now(),
        ]);

        foreach ($quote['lines'] as $line) {
            $snapshot->lines()->create($line);
        }

        foreach ($quote['rate_versions'] as $version) {
            EventBookingFeeRate::create([
                'event_booking_fee_snapshot_id' => $snapshot->event_booking_fee_snapshot_id,
                'venue_rate_id' => $version['venue_rate_id'],
            ]);
        }
    }

    /**
     * @param  list<array{event_booking_fee_line_id: int, quantity: mixed, unit_amount: mixed}>  $submitted
     */
    public function adjust(EventBooking $booking, array $submitted, bool $confirm, User $actor): EventBookingFeeSnapshot
    {
        $snapshot = $booking->feeSnapshot()->with('lines')->first();

        if ($snapshot === null) {
            throw ValidationException::withMessages([
                'fee' => ['This booking has no fee calculation to confirm.'],
            ]);
        }

        $lines = $snapshot->lines->keyBy(fn ($line) => (int) $line->event_booking_fee_line_id);
        $incoming = collect($submitted)->keyBy(fn ($row) => (int) $row['event_booking_fee_line_id']);

        if ($lines->count() !== $incoming->count() || $lines->keys()->diff($incoming->keys())->isNotEmpty()) {
            throw ValidationException::withMessages([
                'lines' => ['Submit every charge line on this booking.'],
            ]);
        }

        foreach ($lines as $id => $line) {
            $row = $incoming->get($id);
            $quantity = $this->money($row['quantity']);
            $unitAmount = $this->money($row['unit_amount']);
            $cents = (int) round(((float) $quantity) * ((float) $unitAmount) * 100);

            $line->update([
                'quantity' => $quantity,
                'unit_amount' => $unitAmount,
                'line_amount' => $this->money($cents / 100),
            ]);
        }

        $snapshot->load('lines');
        $typed = $snapshot->lines->map(fn ($line) => [
            'line_type' => $line->line_type,
            'line_amount' => $line->line_amount,
        ])->all();
        $recalculated = $typed !== [];

        $snapshot->update([
            'venue_amount' => $recalculated ? $this->sum($typed, 'venue') : $snapshot->venue_amount,
            'overtime_amount' => $recalculated ? $this->sum($typed, 'overtime') : $snapshot->overtime_amount,
            'additional_amount' => $recalculated
                ? $this->sum($typed, ['facility', 'equipment', 'service', 'additional'])
                : $snapshot->additional_amount,
            'total_amount' => $recalculated ? $this->sum($typed, null) : $snapshot->total_amount,
            'calculation_note' => $confirm
                ? 'Venue calculation confirmed by the Event Approval Admin.'
                : 'Venue calculation was adjusted and is waiting for confirmation.',
            'calculation_confirmed_at' => $confirm ? now() : null,
            'calculation_confirmed_by' => $confirm ? $actor->user_id : null,
            'calculated_at' => now(),
        ]);

        return $snapshot->fresh('lines');
    }

    /**
     * @param  list<array{line_type: string, line_amount: mixed}>  $lines
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

    private function money(mixed $amount): string
    {
        return number_format(round((float) $amount, 2), 2, '.', '');
    }
}
