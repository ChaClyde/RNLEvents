<?php

namespace App\Scheduling;

use App\Models\Driver;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Permissions\Permission;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class VehicleConflictChecker
{
    /**
     * @return Collection<int, VehicleBooking>
     */
    public function findVehicleConflicts(
        int $vehicleId,
        Carbon $start,
        Carbon $end,
        ?int $excludeBookingId = null,
        bool $lockRows = false,
    ): Collection {
        return $this->findResourceConflicts('vehicle_id', $vehicleId, $start, $end, $excludeBookingId, $lockRows);
    }

    /**
     * @return Collection<int, VehicleBooking>
     */
    public function findDriverConflicts(
        int $driverId,
        Carbon $start,
        Carbon $end,
        ?int $excludeBookingId = null,
        bool $lockRows = false,
    ): Collection {
        return $this->findResourceConflicts('driver_id', $driverId, $start, $end, $excludeBookingId, $lockRows);
    }

    public function assertVehicleAvailable(
        User $viewer,
        Vehicle $vehicle,
        VehicleBooking $booking,
        bool $lockRows = true,
    ): void {
        if ($vehicle->status === 'maintenance') {
            throw ValidationException::withMessages([
                'vehicle_id' => ['This vehicle is under maintenance and cannot be assigned.'],
            ]);
        }

        if ($vehicle->status !== 'available') {
            throw ValidationException::withMessages([
                'vehicle_id' => ['This vehicle is unavailable and cannot be assigned.'],
            ]);
        }

        if ((int) $booking->passenger_count > (int) $vehicle->capacity) {
            throw ValidationException::withMessages([
                'passenger_count' => [
                    "This vehicle's capacity is {$vehicle->capacity} passengers.",
                ],
            ]);
        }

        $conflicts = $this->findVehicleConflicts(
            (int) $vehicle->vehicle_id,
            $booking->tripStartsAt(),
            $booking->tripEndsAt(),
            $booking->vehicle_booking_id,
            $lockRows,
        );

        if ($conflicts->isEmpty()) {
            return;
        }

        ConflictResponse::throw(
            $viewer,
            'vehicle_id',
            'This vehicle already has a pending or approved booking during the selected schedule.',
            Permission::VEHICLE_BOOKINGS_VIEW,
            $conflicts,
            fn (VehicleBooking $row) => $this->detailed($row),
            fn (VehicleBooking $row) => $this->sanitized($row),
        );
    }

    public function assertDriverAvailable(
        User $viewer,
        Driver $driver,
        VehicleBooking $booking,
        bool $lockRows = true,
    ): void {
        $this->assertDriverRecordedAvailability($driver, $booking);

        $conflicts = $this->findDriverConflicts(
            (int) $driver->driver_id,
            $booking->tripStartsAt(),
            $booking->tripEndsAt(),
            $booking->vehicle_booking_id,
            $lockRows,
        );

        if ($conflicts->isEmpty()) {
            return;
        }

        ConflictResponse::throw(
            $viewer,
            'driver_id',
            'This driver already has a pending or approved booking during the selected schedule.',
            Permission::VEHICLE_BOOKINGS_VIEW,
            $conflicts,
            fn (VehicleBooking $row) => $this->detailed($row),
            fn (VehicleBooking $row) => $this->sanitized($row),
        );
    }

    /**
     * @return array{available: bool, reason: ?string}
     */
    public function driverLeaveStatus(Driver $driver, Carbon $start, Carbon $end): array
    {
        foreach (CarbonPeriod::create($start->toDateString(), $end->toDateString()) as $day) {
            $date = $day->toDateString();

            if ($driver->license_expiry !== null && $driver->license_expiry->lt($day->copy()->startOfDay())) {
                return [
                    'available' => false,
                    'reason' => "This driver's license is expired on {$date} and cannot be assigned.",
                ];
            }

            if ($this->driverIsRecordedUnavailable($driver, $date)) {
                $status = $driver->driver_status;
                $reason = trim((string) $driver->status_remarks);
                $message = "This driver is unavailable ({$status})";

                if ($reason !== '') {
                    $message .= ": {$reason}";
                }

                return [
                    'available' => false,
                    'reason' => $message . '.',
                ];
            }
        }

        return ['available' => true, 'reason' => null];
    }

    /**
     * @return array<string, mixed>
     */
    public function detailed(VehicleBooking $booking): array
    {
        return [
            'type' => 'vehicle_booking',
            'id' => $booking->vehicle_booking_id,
            'purpose' => $booking->purpose,
            'destination' => $booking->destination,
            'status' => $booking->status,
            'travel_date' => $booking->travel_date?->toDateString(),
            'expected_return_date' => $booking->expected_return_date?->toDateString(),
            'departure_time' => $this->timeValue($booking->departure_time),
            'expected_return_time' => $this->timeValue($booking->expected_return_time),
            'requested_by' => $booking->requested_by,
            'office' => $booking->office?->office_name,
            'visible' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function sanitized(VehicleBooking $booking): array
    {
        return [
            'type' => 'vehicle_booking',
            'id' => null,
            'purpose' => 'Reserved',
            'destination' => null,
            'status' => $booking->status,
            'travel_date' => $booking->travel_date?->toDateString(),
            'expected_return_date' => $booking->expected_return_date?->toDateString(),
            'departure_time' => $this->timeValue($booking->departure_time),
            'expected_return_time' => $this->timeValue($booking->expected_return_time),
            'requested_by' => null,
            'office' => null,
            'visible' => false,
        ];
    }

    private function assertDriverRecordedAvailability(Driver $driver, VehicleBooking $booking): void
    {
        $result = $this->driverLeaveStatus($driver, $booking->tripStartsAt(), $booking->tripEndsAt());

        if ($result['available']) {
            return;
        }

        throw ValidationException::withMessages([
            'driver_id' => [$result['reason']],
        ]);
    }

    /**
     * @return Collection<int, VehicleBooking>
     */
    private function findResourceConflicts(
        string $column,
        int $resourceId,
        Carbon $start,
        Carbon $end,
        ?int $excludeBookingId,
        bool $lockRows,
    ): Collection {
        $query = VehicleBooking::query()
            ->with(['office:office_id,office_name,office_code'])
            ->scheduleBlocking()
            ->where($column, $resourceId)
            ->whereDate('travel_date', '<=', $end->toDateString())
            ->whereDate('expected_return_date', '>=', $start->toDateString())
            ->orderBy('vehicle_booking_id');

        if ($excludeBookingId !== null) {
            $query->where('vehicle_booking_id', '!=', $excludeBookingId);
        }

        if ($lockRows) {
            $query->lockForUpdate();
        }

        return $query->get()->filter(
            fn (VehicleBooking $candidate) => $candidate->overlapsTrip($start, $end)
        )->values();
    }

    private function driverIsRecordedUnavailable(Driver $driver, string $date): bool
    {
        if ($driver->driver_status === 'Available') {
            return false;
        }

        $start = $driver->status_start_date;
        $end = $driver->status_end_date;

        if ($start === null && $end === null) {
            return true;
        }

        if ($start !== null && $start->toDateString() > $date) {
            return false;
        }

        if ($end !== null && $end->toDateString() < $date) {
            return false;
        }

        return true;
    }

    private function timeValue(mixed $time): string
    {
        if ($time instanceof Carbon) {
            return $time->format('H:i:s');
        }

        return is_string($time) ? $time : (string) $time;
    }
}
