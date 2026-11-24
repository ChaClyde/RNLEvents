<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VenueMaintenance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VenueMaintenanceController extends Controller
{
    private const STATUSES = ['scheduled', 'completed', 'cancelled'];

    private function relations(): array
    {
        return ['venue:venue_id,venue,location'];
    }

    public function loadMaintenance(Request $request)
    {
        $query = VenueMaintenance::with($this->relations())
            ->whereHas('venue', fn ($venue) => $venue->where('is_deleted', false));

        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->venue_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->boolean('upcoming')) {
            $query->where('status', 'scheduled')
                ->whereDate('date_end', '>=', Carbon::today()->toDateString());
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($rows) use ($search) {
                $rows->where('reason', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'message' => 'Venue maintenance records retrieved successfully.',
            'data' => $query->orderByDesc('date_start')->get(),
        ], 200);
    }

    public function storeMaintenance(Request $request)
    {
        $validated = $request->validate([
            'venue_id' => [
                'required',
                'integer',
                Rule::exists('tbl_venues', 'venue_id')
                    ->where(fn ($query) => $query->where('is_deleted', false)),
            ],
            'reason' => ['required', 'string', 'max:150'],
            'notes' => ['nullable', 'string'],
            'date_start' => ['required', 'date', 'after_or_equal:today'],
            'date_end' => ['required', 'date', 'after_or_equal:date_start'],
        ]);

        $start = Carbon::parse($validated['date_start'])->toDateString();
        $end = Carbon::parse($validated['date_end'])->toDateString();

        $this->assertNoOverlap($validated['venue_id'], $start, $end);

        $maintenance = VenueMaintenance::create([
            ...$validated,
            'date_start' => $start,
            'date_end' => $end,
            'status' => 'scheduled',
        ]);

        return response()->json([
            'message' => 'Venue maintenance scheduled successfully.',
            'data' => $maintenance->load($this->relations()),
        ], 201);
    }

    public function updateMaintenance(Request $request, $maintenance_id)
    {
        $maintenance = VenueMaintenance::findOrFail($maintenance_id);

        if ($maintenance->status !== 'scheduled') {
            throw ValidationException::withMessages([
                'status' => ['Only scheduled maintenance can be edited.'],
            ]);
        }

        $validated = $request->validate([
            'reason' => ['sometimes', 'required', 'string', 'max:150'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'date_start' => ['sometimes', 'required', 'date'],
            'date_end' => ['sometimes', 'required', 'date'],
        ]);

        $start = isset($validated['date_start'])
            ? Carbon::parse($validated['date_start'])->toDateString()
            : $maintenance->date_start->toDateString();
        $end = isset($validated['date_end'])
            ? Carbon::parse($validated['date_end'])->toDateString()
            : $maintenance->date_end->toDateString();

        if ($end < $start) {
            throw ValidationException::withMessages([
                'date_end' => ['The end date cannot be before the start date.'],
            ]);
        }

        $this->assertNoOverlap($maintenance->venue_id, $start, $end, $maintenance->maintenance_id);

        $maintenance->update([
            ...$validated,
            'date_start' => $start,
            'date_end' => $end,
        ]);

        return response()->json([
            'message' => 'Venue maintenance updated successfully.',
            'data' => $maintenance->fresh()->load($this->relations()),
        ], 200);
    }

    public function updateMaintenanceStatus(Request $request, $maintenance_id)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(self::STATUSES)],
        ]);

        $maintenance = VenueMaintenance::findOrFail($maintenance_id);

        if ($validated['status'] === 'scheduled') {
            $this->assertNoOverlap(
                $maintenance->venue_id,
                $maintenance->date_start->toDateString(),
                $maintenance->date_end->toDateString(),
                $maintenance->maintenance_id
            );
        }

        $maintenance->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Venue maintenance status updated successfully.',
            'data' => $maintenance->fresh()->load($this->relations()),
        ], 200);
    }

    public function destroyMaintenance($maintenance_id)
    {
        VenueMaintenance::findOrFail($maintenance_id)->delete();

        return response()->json([
            'message' => 'Venue maintenance record deleted successfully.',
        ], 200);
    }

    private function assertNoOverlap(
        $venue_id,
        string $start,
        string $end,
        $exclude_maintenance_id = null
    ): void {
        $existing = VenueMaintenance::where('venue_id', $venue_id)
            ->where('status', 'scheduled')
            ->whereDate('date_start', '<=', $end)
            ->whereDate('date_end', '>=', $start)
            ->when(
                $exclude_maintenance_id !== null,
                fn ($query) => $query->where('maintenance_id', '!=', $exclude_maintenance_id)
            )
            ->first();

        if ($existing) {
            throw ValidationException::withMessages([
                'date_start' => [
                    "This venue already has maintenance scheduled {$existing->range_label} ({$existing->reason}).",
                ],
            ]);
        }
    }
}
