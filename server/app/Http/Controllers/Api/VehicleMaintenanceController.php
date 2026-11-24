<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehicleMaintenance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VehicleMaintenanceController extends Controller
{
    private const STATUSES = ['scheduled', 'completed', 'cancelled'];

    private function relations(): array
    {
        return ['vehicle:vehicle_id,vehicle_name,plate_number'];
    }

    /*
    |--------------------------------------------------------------------------
    | Load Maintenance Sheet
    |--------------------------------------------------------------------------
    */

    public function loadMaintenance(Request $request)
    {
        // Maintenance of trashed vehicles is hidden
        $query = VehicleMaintenance::with($this->relations())
            ->whereHas('vehicle', fn ($vehicle) => $vehicle->where('is_deleted', false));

        if ($request->filled('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Only maintenance that is running now or still coming up
        if ($request->boolean('upcoming')) {
            $query->where('status', 'scheduled')
                ->whereDate('date_end', '>=', Carbon::today()->toDateString());
        }

        // Anything overlapping a date window
        if ($request->filled('date_from')) {
            $query->whereDate('date_end', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date_start', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('reason', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhereHas('vehicle', function ($vehicle) use ($search) {
                        $vehicle->where('vehicle_name', 'like', "%{$search}%")
                            ->orWhere('plate_number', 'like', "%{$search}%");
                    });
            });
        }

        return response()->json([
            'message' => 'Maintenance records retrieved successfully.',
            'data' => $query->orderByDesc('date_start')->get(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Get Single Maintenance Record
    |--------------------------------------------------------------------------
    */

    public function getMaintenance($maintenance_id)
    {
        $maintenance = VehicleMaintenance::with($this->relations())
            ->findOrFail($maintenance_id);

        return response()->json([
            'message' => 'Maintenance record retrieved successfully.',
            'data' => $maintenance,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Store Maintenance
    |--------------------------------------------------------------------------
    */

    public function storeMaintenance(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => [
                'required',
                'integer',
                Rule::exists('tbl_vehicles', 'vehicle_id')->where('is_deleted', false),
            ],
            'reason' => ['required', 'string', 'max:150'],
            'notes' => ['nullable', 'string'],
            'date_start' => ['required', 'date', 'after_or_equal:today'],
            'date_end' => ['required', 'date', 'after_or_equal:date_start'],
        ]);

        $start = Carbon::parse($validated['date_start'])->toDateString();
        $end = Carbon::parse($validated['date_end'])->toDateString();

        $this->assertNoOverlap($validated['vehicle_id'], $start, $end);

        $maintenance = VehicleMaintenance::create([
            ...$validated,
            'date_start' => $start,
            'date_end' => $end,
            'status' => 'scheduled',
        ]);

        return response()->json([
            'message' => 'Maintenance scheduled successfully.',
            'data' => $maintenance->load($this->relations()),
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Update Maintenance
    |--------------------------------------------------------------------------
    */

    public function updateMaintenance(Request $request, $maintenance_id)
    {
        $maintenance = VehicleMaintenance::findOrFail($maintenance_id);

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

        $this->assertNoOverlap(
            $maintenance->vehicle_id,
            $start,
            $end,
            $maintenance->maintenance_id
        );

        $maintenance->update([
            ...$validated,
            'date_start' => $start,
            'date_end' => $end,
        ]);

        return response()->json([
            'message' => 'Maintenance updated successfully.',
            'data' => $maintenance->fresh()->load($this->relations()),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Complete / Cancel / Reopen Maintenance
    |--------------------------------------------------------------------------
    |
    | Marking a record completed or cancelled frees the vehicle immediately,
    | even before the end date.
    |
    */

    public function updateMaintenanceStatus(Request $request, $maintenance_id)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(self::STATUSES)],
        ]);

        $maintenance = VehicleMaintenance::findOrFail($maintenance_id);

        // Reopening must not clash with another scheduled record
        if ($validated['status'] === 'scheduled') {
            $this->assertNoOverlap(
                $maintenance->vehicle_id,
                $maintenance->date_start->toDateString(),
                $maintenance->date_end->toDateString(),
                $maintenance->maintenance_id
            );
        }

        $maintenance->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Maintenance status updated successfully.',
            'data' => $maintenance->fresh()->load($this->relations()),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Delete Maintenance
    |--------------------------------------------------------------------------
    */

    public function destroyMaintenance($maintenance_id)
    {
        VehicleMaintenance::findOrFail($maintenance_id)->delete();

        return response()->json([
            'message' => 'Maintenance record deleted successfully.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | One Scheduled Record per Vehicle per Date Range
    |--------------------------------------------------------------------------
    */

    private function assertNoOverlap(
        $vehicle_id,
        string $start,
        string $end,
        $exclude_maintenance_id = null
    ): void {
        $existing = VehicleMaintenance::where('vehicle_id', $vehicle_id)
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
                    "This vehicle already has maintenance scheduled {$existing->range_label} ({$existing->reason}).",
                ],
            ]);
        }
    }
}