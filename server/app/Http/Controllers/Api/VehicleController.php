<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VehicleController extends Controller
{
    public function loadVehicles()
    {
        $vehicles = Vehicle::where('is_deleted', false)->get();

        return response()->json([
            'vehicles' => $vehicles,
        ], 200);
    }

    public function getVehicle($vehicle_id)
    {
        $vehicle = Vehicle::findOrFail($vehicle_id);

        return response()->json([
            'vehicle' => $vehicle,
        ], 200);
    }

    public function storeVehicle(Request $request)
    {
        $validated = $request->validate([
            'image_path' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'vehicle_name' => ['required', 'string', 'min:3', 'max:100'],
            'vehicle_maintenance' => ['required', 'string', 'max:20', 'unique:tbl_vehicles,vehicle_maintenance'],
            'vehicle_type' => ['nullable', 'string', 'max:100'],
            'capacity' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'max:50'],
        ], [
            'image_path.image' => 'Vehicle image must be an image.',
            'image_path.mimes' => 'Vehicle image must be JPG, JPEG, PNG or WEBP.',
            'image_path.max' => 'Vehicle image must not exceed 2MB.',
            'vehicle_name.required' => 'Vehicle name is required.',
            'vehicle_maintenance.required' => 'Maintenance information is required.',
            'vehicle_maintenance.unique' => 'A vehicle with this maintenance information already exists.',
        ]);

        $imagePath = null;

        if ($request->hasFile('image_path')) {
            $imagePath = $request->file('image_path')->store('', 'vehicles');
        }

        $vehicle = Vehicle::create([
            'vehicle_name' => $validated['vehicle_name'],
            'vehicle_maintenance' => $validated['vehicle_maintenance'],
            'vehicle_type' => $validated['vehicle_type'] ?? null,
            'capacity' => $validated['capacity'] ?? null,
            'status' => $validated['status'] ?? 'available',
            'image_path' => $imagePath,
        ]);

        return response()->json([
            'message' => 'Vehicle created successfully.',
            'vehicle' => $vehicle,
        ], 201);
    }

    public function updateVehicle(Request $request, Vehicle $vehicle)
    {
        $validated = $request->validate([
            'image_path' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'vehicle_name' => ['required', 'string', 'min:3', 'max:100'],
            'vehicle_maintenance' => [
                'required', 'string', 'max:20',
                'unique:tbl_vehicles,vehicle_maintenance,' . $vehicle->vehicle_id . ',vehicle_id',
            ],
            'vehicle_type' => ['nullable', 'string', 'max:100'],
            'capacity' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'max:50'],
            'remove_image' => ['nullable', 'boolean'],
        ]);

        $imagePath = $vehicle->image_path;

        if ($request->hasFile('image_path')) {
            if ($vehicle->image_path && Storage::disk('vehicles')->exists($vehicle->image_path)) {
                Storage::disk('vehicles')->delete($vehicle->image_path);
            }
            $imagePath = $request->file('image_path')->store('', 'vehicles');
        } elseif ($request->boolean('remove_image')) {
            if ($vehicle->image_path && Storage::disk('vehicles')->exists($vehicle->image_path)) {
                Storage::disk('vehicles')->delete($vehicle->image_path);
            }
            $imagePath = null;
        }

        $vehicle->update([
            'vehicle_name' => $validated['vehicle_name'],
            'vehicle_maintenance' => $validated['vehicle_maintenance'],
            'vehicle_type' => $validated['vehicle_type'] ?? null,
            'capacity' => $validated['capacity'] ?? null,
            'status' => $validated['status'] ?? 'available',
            'image_path' => $imagePath,
        ]);

        return response()->json([
            'message' => 'Vehicle updated successfully.',
            'vehicle' => $vehicle->fresh(),
        ], 200);
    }

    public function destroyVehicle(Vehicle $vehicle)
    {
        $vehicle->update(['is_deleted' => true]);

        return response()->json([
            'message' => 'Vehicle successfully deleted.',
        ], 200);
    }

    public function loadTrashVehicles()
    {
        $vehicles = Vehicle::where('is_deleted', true)->get();

        return response()->json([
            'vehicles' => $vehicles,
        ], 200);
    }

    public function restoreVehicle(Vehicle $vehicle)
    {
        $vehicle->update(['is_deleted' => false]);

        return response()->json([
            'message' => 'Vehicle restored successfully.',
            'vehicle' => $vehicle->fresh(),
        ], 200);
    }

    public function forceDeleteVehicle(Vehicle $vehicle)
    {
        if ($vehicle->image_path && Storage::disk('vehicles')->exists($vehicle->image_path)) {
            Storage::disk('vehicles')->delete($vehicle->image_path);
        }

        $vehicle->delete();

        return response()->json([
            'message' => 'Vehicle permanently deleted.',
        ], 200);
    }

    /**
     * Stream a vehicle's image (private disk)
     */
    public function showVehicleImage(Vehicle $vehicle)
    {
        if (!$vehicle->image_path || !Storage::disk('vehicles')->exists($vehicle->image_path)) {
            abort(404);
        }

        return Storage::disk('vehicles')->response($vehicle->image_path);
    }
}
