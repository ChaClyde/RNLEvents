<?php

namespace App\VehicleBookings;

use App\Models\Driver;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Permissions\ApprovalStage;
use App\Scheduling\VehicleConflictChecker;
use Illuminate\Validation\ValidationException;

class VehicleAssignmentService
{
    public function __construct(private readonly VehicleConflictChecker $conflicts)
    {
    }

    public function assign(User $actor, VehicleBooking $booking, int $vehicleId, int $driverId): VehicleBooking
    {
        if ($booking->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending vehicle bookings can receive an assignment.'],
            ]);
        }

        if (!ApprovalStage::isVehicleAssignmentStage((string) $booking->approval_stage)) {
            throw ValidationException::withMessages([
                'approval_stage' => [
                    'Vehicle and driver assignment is available after Vehicle Approval Admin review.',
                ],
            ]);
        }

        $vehicle = Vehicle::query()
            ->where('is_deleted', false)
            ->lockForUpdate()
            ->findOrFail($vehicleId);

        $driver = Driver::query()
            ->where('is_deleted', false)
            ->lockForUpdate()
            ->findOrFail($driverId);

        $this->conflicts->assertVehicleAvailable($actor, $vehicle, $booking);
        $this->conflicts->assertDriverAvailable($actor, $driver, $booking);

        $booking->update([
            'vehicle_id' => $vehicle->vehicle_id,
            'driver_id' => $driver->driver_id,
        ]);

        return $booking;
    }

    public function assertReadyForAdvancement(User $actor, VehicleBooking $booking): void
    {
        if (!ApprovalStage::isVehicleAssignmentStage((string) $booking->approval_stage)) {
            return;
        }

        if (!$booking->hasAssignment()) {
            throw ValidationException::withMessages([
                'vehicle_id' => [
                    'A vehicle and driver must be assigned before this stage can be approved.',
                ],
            ]);
        }

        $vehicle = Vehicle::query()
            ->where('is_deleted', false)
            ->lockForUpdate()
            ->findOrFail($booking->vehicle_id);

        $driver = Driver::query()
            ->where('is_deleted', false)
            ->lockForUpdate()
            ->findOrFail($booking->driver_id);

        $this->conflicts->assertVehicleAvailable($actor, $vehicle, $booking);
        $this->conflicts->assertDriverAvailable($actor, $driver, $booking);
    }
}
