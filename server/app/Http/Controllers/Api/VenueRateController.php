<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventBookingFeeRate;
use App\Models\Venue;
use App\Models\VenueRate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VenueRateController extends Controller
{
    public function index(int $venue_id)
    {
        $venue = $this->venue($venue_id);

        $rates = $venue->rates()
            ->with('charges')
            ->orderByDesc('effective_from')
            ->orderByDesc('venue_rate_id')
            ->get();

        return response()->json(['data' => $rates]);
    }

    public function store(Request $request, int $venue_id)
    {
        $venue = $this->venue($venue_id);
        $validated = $this->validateRate($request, $venue);

        $rate = DB::transaction(function () use ($request, $venue, $validated) {
            if ($validated['is_active'] ?? true) {
                $this->assertUniqueEffectiveDate($venue, $validated['effective_from']);
            }

            $rate = $venue->rates()->create([
                ...$this->rateAttributes($validated),
                'created_by' => $request->user()?->user_id,
            ]);

            $this->syncCharges($rate, $validated['charges'] ?? []);

            return $rate;
        });

        return response()->json([
            'message' => 'Venue rate saved.',
            'data' => $rate->load('charges'),
        ], 201);
    }

    public function update(Request $request, int $venue_id, int $venue_rate_id)
    {
        $venue = $this->venue($venue_id);
        $rate = $this->rate($venue, $venue_rate_id);
        $validated = $this->validateRate($request, $venue);

        $updated = DB::transaction(function () use ($rate, $venue, $validated) {
            if ($validated['is_active'] ?? true) {
                $this->assertUniqueEffectiveDate($venue, $validated['effective_from'], $rate->venue_rate_id);
            }

            if ($this->isReferenced($rate) && $this->pricingChanged($rate, $validated)) {
                throw ValidationException::withMessages([
                    'effective_from' => [
                        'This rate is already used by a booking. Add a new rate with a later effective date.',
                    ],
                ]);
            }

            $rate->update($this->rateAttributes($validated));

            if (!$this->isReferenced($rate)) {
                $rate->charges()->delete();
                $this->syncCharges($rate, $validated['charges'] ?? []);
            }

            return $rate;
        });

        return response()->json([
            'message' => 'Venue rate updated.',
            'data' => $updated->load('charges'),
        ]);
    }

    public function destroy(int $venue_id, int $venue_rate_id)
    {
        $venue = $this->venue($venue_id);
        $rate = $this->rate($venue, $venue_rate_id);

        if ($this->isReferenced($rate)) {
            throw ValidationException::withMessages([
                'venue_rate_id' => [
                    'This rate is already used by a booking. Deactivate it instead of deleting it.',
                ],
            ]);
        }

        $rate->delete();

        return response()->json(['message' => 'Venue rate deleted.']);
    }

    private function venue(int $venueId): Venue
    {
        return Venue::query()
            ->where('is_deleted', false)
            ->findOrFail($venueId);
    }

    private function rate(Venue $venue, int $rateId): VenueRate
    {
        return $venue->rates()->where('venue_rate_id', $rateId)->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateRate(Request $request, Venue $venue): array
    {
        $validated = $request->validate([
            'pricing_basis' => ['required', Rule::in(['hourly', 'daily'])],
            'hourly_rate' => ['required_if:pricing_basis,hourly', 'nullable', 'numeric', 'min:0'],
            'daily_rate' => ['required_if:pricing_basis,daily', 'nullable', 'numeric', 'min:0'],
            'overtime_rate' => ['nullable', 'numeric', 'min:0'],
            'overtime_policy' => ['nullable', 'string'],
            'included_hours' => ['nullable', 'numeric', 'min:0'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'charges' => ['nullable', 'array'],
            'charges.*.charge_name' => ['required', 'string', 'max:100'],
            'charges.*.charge_type' => ['required', Rule::in(['facility', 'equipment', 'service'])],
            'charges.*.amount' => ['required', 'numeric', 'min:0'],
            'charges.*.unit' => ['required', Rule::in(['per_booking', 'per_day', 'per_hour', 'per_overtime_hour'])],
            'charges.*.is_active' => ['nullable', 'boolean'],
            'charges.*.venue_resource_id' => [
                'nullable',
                'integer',
                Rule::exists('tbl_venue_resources', 'resource_id')
                    ->where(fn ($query) => $query->where('venue_id', $venue->venue_id)),
            ],
        ]);

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function rateAttributes(array $validated): array
    {
        return [
            'pricing_basis' => $validated['pricing_basis'],
            'hourly_rate' => $validated['pricing_basis'] === 'hourly' ? $validated['hourly_rate'] : null,
            'daily_rate' => $validated['pricing_basis'] === 'daily' ? $validated['daily_rate'] : null,
            'overtime_rate' => $validated['overtime_rate'] ?? 0,
            'overtime_policy' => $validated['overtime_policy'] ?? null,
            'included_hours' => $validated['included_hours'] ?? null,
            'effective_from' => $validated['effective_from'],
            'effective_to' => $validated['effective_to'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $charges
     */
    private function syncCharges(VenueRate $rate, array $charges): void
    {
        foreach ($charges as $charge) {
            $rate->charges()->create([
                'venue_resource_id' => $charge['venue_resource_id'] ?? null,
                'charge_name' => $charge['charge_name'],
                'charge_type' => $charge['charge_type'],
                'amount' => $charge['amount'],
                'unit' => $charge['unit'],
                'is_active' => $charge['is_active'] ?? true,
            ]);
        }
    }

    private function assertUniqueEffectiveDate(Venue $venue, string $effectiveFrom, ?int $ignoreId = null): void
    {
        $exists = $venue->rates()
            ->where('is_active', true)
            ->whereDate('effective_from', $effectiveFrom)
            ->when($ignoreId, fn ($query) => $query->where('venue_rate_id', '!=', $ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'effective_from' => ['An active rate already starts on this date.'],
            ]);
        }
    }

    private function isReferenced(VenueRate $rate): bool
    {
        return EventBookingFeeRate::query()
            ->where('venue_rate_id', $rate->venue_rate_id)
            ->exists();
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function pricingChanged(VenueRate $rate, array $validated): bool
    {
        $next = $this->rateAttributes($validated);

        foreach (['pricing_basis', 'hourly_rate', 'daily_rate', 'overtime_rate', 'included_hours', 'effective_from'] as $field) {
            if ($this->normalize($rate->{$field}) !== $this->normalize($next[$field])) {
                return true;
            }
        }

        if (!array_key_exists('charges', $validated)) {
            return false;
        }

        $currentCharges = $rate->charges()
            ->get(['charge_name', 'charge_type', 'amount', 'unit', 'venue_resource_id', 'is_active'])
            ->map(fn ($charge) => [
                $charge->charge_name,
                $charge->charge_type,
                $this->normalize($charge->amount),
                $charge->unit,
                $charge->venue_resource_id,
                (bool) $charge->is_active,
            ])->all();

        $incoming = array_map(fn ($charge) => [
            $charge['charge_name'],
            $charge['charge_type'],
            $this->normalize($charge['amount']),
            $charge['unit'],
            $charge['venue_resource_id'] ?? null,
            (bool) ($charge['is_active'] ?? true),
        ], $validated['charges'] ?? []);

        return $currentCharges !== $incoming;
    }

    private function normalize(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        if (is_numeric($value)) {
            return number_format((float) $value, 2, '.', '');
        }

        return (string) $value;
    }
}
