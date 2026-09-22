<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
// use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DriverController extends Controller
{
    public function loadDrivers()
    {
        $drivers = Driver::where('is_deleted', false)->get();

        return response()->json([
            'drivers' => $drivers
        ], 200);
    }

    public function getDriver($driver_id)
    {
        $driver = Driver::findOrFail($driver_id);

        return response()->json([
            'driver' => $driver
        ], 200);
    }

    public function storeDriver(Request $request)
    {
        $validated = $request->validate([
            'driver_name' => ['required', 'string', 'min:3', 'max:100'],
            'driver_status' => ['nullable', Rule::in(['Available', 'On Leave', 'Sick Leave', 'Unavailable'])],
            'status_remarks' => ['nullable', 'string', 'max:255'],
        ], [
            'driver_name.required' => 'Driver name is required.',
            'driver_name.min' => 'Driver name must be at least 3 characters.',
            'driver_name.max' => 'Driver name must not exceed 100 characters.',
            'driver_status.in' => 'Invalid driver status.',
            'status_remarks.max' => 'Remarks must not exceed 255 characters.',
        ]);

        $driver = Driver::create([
            'driver_name' => $validated['driver_name'],
            'driver_status' => $validated['driver_status'] ?? 'Available',
            'status_remarks' => $validated['status_remarks'] ?? null,
        ]);

        // ActivityLogger::log(
        //     $request,
        //     'created',
        //     'driver',
        //     sprintf('Created driver: %s', $driver->driver_name),
        //     $driver->driver_id,
        //     $driver->driver_name
        // );

        return response()->json([
            'message' => 'Driver successfully created.',
            'driver' => $driver
        ], 201);
    }

    public function updateDriver(Request $request, Driver $driver)
    {
        $validated = $request->validate([
            'driver_name' => ['required', 'string', 'min:3', 'max:100'],
            'driver_status' => ['required', Rule::in(['Available', 'On Leave', 'Sick Leave', 'Unavailable'])],
            'status_remarks' => ['nullable', 'string', 'max:255'],
        ], [
            'driver_name.required' => 'Driver name is required.',
            'driver_name.min' => 'Driver name must be at least 3 characters.',
            'driver_name.max' => 'Driver name must not exceed 100 characters.',
            'driver_status.required' => 'Driver status is required.',
            'driver_status.in' => 'Invalid driver status.',
            'status_remarks.max' => 'Remarks must not exceed 255 characters.',
        ]);

        $driver->update([
            'driver_name' => $validated['driver_name'],
            'driver_status' => $validated['driver_status'],
            'status_remarks' => $validated['status_remarks'] ?? null,
        ]);

        // ActivityLogger::log(
        //     $request,
        //     'updated',
        //     'driver',
        //     sprintf('Updated driver: %s', $driver->driver_name),
        //     $driver->driver_id,
        //     $driver->driver_name
        // );

        return response()->json([
            'message' => 'Driver successfully updated.',
            'driver' => $driver->fresh()
        ], 200);
    }

    public function destroyDriver(Request $request, Driver $driver)
    {
        $driver->update(['is_deleted' => true]);

        // ActivityLogger::log(
        //     $request,
        //     'deleted',
        //     'driver',
        //     sprintf('Deleted driver: %s', $driver->driver_name),
        //     $driver->driver_id,
        //     $driver->driver_name
        // );

        return response()->json([
            'message' => 'Driver successfully deleted.'
        ], 200);
    }

    public function loadTrashDrivers()
    {
        $drivers = Driver::where('is_deleted', true)->get();

        return response()->json([
            'drivers' => $drivers
        ], 200);
    }

    public function restoreDriver(Request $request, Driver $driver)
    {
        if (!$driver->is_deleted) {
            return response()->json(['message' => 'This driver is already active.'], 422);
        }

        $driver->update(['is_deleted' => false]);

        // ActivityLogger::log(
        //     $request,
        //     'restored',
        //     'driver',
        //     sprintf('Restored driver: %s', $driver->driver_name),
        //     $driver->driver_id,
        //     $driver->driver_name
        // );

        return response()->json([
            'message' => 'Driver restored successfully.',
            'driver' => $driver->fresh()
        ], 200);
    }

    public function forceDeleteDriver(Request $request, Driver $driver)
    {
        if (!$driver->is_deleted) {
            return response()->json(['message' => 'Only deleted drivers can be permanently removed.'], 422);
        }

        $driverId = $driver->driver_id;
        $driverName = $driver->driver_name;

        $driver->delete();

        // ActivityLogger::log(
        //     $request,
        //     'force_deleted',
        //     'driver',
        //     sprintf('Permanently deleted driver: %s', $driverName),
        //     $driverId,
        //     $driverName
        // );

        return response()->json(['message' => 'Driver permanently deleted.'], 200);
    }
}