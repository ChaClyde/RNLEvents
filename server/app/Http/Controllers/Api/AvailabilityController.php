<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Vehicle;
use App\Permissions\Permission;
use App\Scheduling\SchedulePeriod;
use App\Scheduling\VehicleConflictChecker;
use App\Scheduling\VenueConflictChecker;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AvailabilityController extends Controller
{
    public function venues(Request $request, VenueConflictChecker $checker)
    {
        $validated = $request->validate([
            'venue_id' => [
                'required',
                'integer',
                Rule::exists('tbl_venues', 'venue_id')->where(fn ($query) => $query->where('is_deleted', false)),
            ],
            'date_start' => ['required', 'date'],
            'date_end' => ['required', 'date', 'after_or_equal:date_start'],
            'time_start' => ['required', 'date_format:H:i'],
            'time_end' => ['required', 'date_format:H:i'],
            'exclude_event_booking_id' => ['nullable', 'integer'],
        ]);

        $conflicts = $checker->find(
            (int) $validated['venue_id'],
            $validated['date_start'],
            $validated['date_end'],
            $validated['time_start'],
            $validated['time_end'],
            isset($validated['exclude_event_booking_id'])
                ? (int) $validated['exclude_event_booking_id']
                : null,
        );

        $payload = $conflicts->map(function ($booking) use ($request, $checker) {
            $canSee = $request->user()->allows(Permission::EVENT_BOOKINGS_VIEW, [
                'resource' => $booking,
            ]);

            return $canSee ? $checker->detailed($booking) : $checker->sanitized($booking);
        })->values();

        return response()->json([
            'available' => $payload->isEmpty(),
            'conflicts' => $payload,
            'message' => $payload->isEmpty()
                ? 'This venue is available for the selected schedule.'
                : 'This venue already has a pending or approved booking during the selected schedule.',
        ]);
    }

    public function vehicles(Request $request, VehicleConflictChecker $checker)
    {
        $validated = $this->tripRules($request, 'vehicle_id', 'tbl_vehicles', 'vehicle_id');
        $window = $this->tripWindow($validated);

        $vehicle = Vehicle::query()
            ->where('is_deleted', false)
            ->findOrFail($validated['vehicle_id']);

        $statusBlocked = $vehicle->status !== 'available';
        $capacityBlocked = isset($validated['passenger_count'])
            && (int) $validated['passenger_count'] > (int) $vehicle->capacity;

        $conflicts = $checker->findVehicleConflicts(
            (int) $vehicle->vehicle_id,
            $window['start'],
            $window['end'],
            isset($validated['exclude_vehicle_booking_id'])
                ? (int) $validated['exclude_vehicle_booking_id']
                : null,
        )->map(function ($booking) use ($request, $checker) {
            $canSee = $request->user()->allows(Permission::VEHICLE_BOOKINGS_VIEW, [
                'resource' => $booking,
            ]);

            return $canSee ? $checker->detailed($booking) : $checker->sanitized($booking);
        })->values();

        $available = !$statusBlocked && !$capacityBlocked && $conflicts->isEmpty();

        $message = 'This vehicle is available for the selected schedule.';
        if ($vehicle->status === 'maintenance') {
            $message = 'This vehicle is under maintenance and cannot be assigned.';
        } elseif ($statusBlocked) {
            $message = 'This vehicle is unavailable and cannot be assigned.';
        } elseif ($capacityBlocked) {
            $message = "This vehicle's capacity is {$vehicle->capacity} passengers.";
        } elseif ($conflicts->isNotEmpty()) {
            $message = 'This vehicle already has a pending or approved booking during the selected schedule.';
        }

        return response()->json([
            'available' => $available,
            'conflicts' => $conflicts,
            'vehicle_status' => $vehicle->status,
            'capacity' => $vehicle->capacity,
            'message' => $message,
        ]);
    }

    public function drivers(Request $request, VehicleConflictChecker $checker)
    {
        $validated = $this->tripRules($request, 'driver_id', 'tbl_drivers', 'driver_id');
        $window = $this->tripWindow($validated);

        $driver = Driver::query()
            ->where('is_deleted', false)
            ->findOrFail($validated['driver_id']);

        $leave = $checker->driverLeaveStatus($driver, $window['start'], $window['end']);

        $conflicts = $checker->findDriverConflicts(
            (int) $driver->driver_id,
            $window['start'],
            $window['end'],
            isset($validated['exclude_vehicle_booking_id'])
                ? (int) $validated['exclude_vehicle_booking_id']
                : null,
        )->map(function ($booking) use ($request, $checker) {
            $canSee = $request->user()->allows(Permission::VEHICLE_BOOKINGS_VIEW, [
                'resource' => $booking,
            ]);

            return $canSee ? $checker->detailed($booking) : $checker->sanitized($booking);
        })->values();

        $canSeeReason = $request->user()->allows(Permission::DRIVERS_VIEW)
            || $request->user()->allows(Permission::VEHICLE_APPROVALS_APPROVE);

        $reason = $leave['reason'];
        if ($reason && !$canSeeReason) {
            $reason = 'This driver is unavailable for the selected schedule.';
        }

        $available = $leave['available'] && $conflicts->isEmpty();
        $message = $available
            ? 'This driver is available for the selected schedule.'
            : ($reason ?? 'This driver already has a pending or approved booking during the selected schedule.');

        return response()->json([
            'available' => $available,
            'conflicts' => $conflicts,
            'unavailability_reason' => $leave['available'] ? null : $reason,
            'driver_status' => $canSeeReason ? $driver->driver_status : null,
            'message' => $message,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function tripRules(Request $request, string $idField, string $table, string $column): array
    {
        return $request->validate([
            $idField => [
                'required',
                'integer',
                Rule::exists($table, $column)->where(fn ($query) => $query->where('is_deleted', false)),
            ],
            'travel_date' => ['required', 'date'],
            'expected_return_date' => ['required', 'date', 'after_or_equal:travel_date'],
            'departure_time' => ['required', 'date_format:H:i'],
            'expected_return_time' => ['required', 'date_format:H:i'],
            'passenger_count' => ['nullable', 'integer', 'min:1'],
            'exclude_vehicle_booking_id' => ['nullable', 'integer'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{start: \Carbon\Carbon, end: \Carbon\Carbon}
     */
    private function tripWindow(array $validated): array
    {
        return [
            'start' => SchedulePeriod::combine($validated['travel_date'], $validated['departure_time']),
            'end' => SchedulePeriod::combine($validated['expected_return_date'], $validated['expected_return_time']),
        ];
    }

}
