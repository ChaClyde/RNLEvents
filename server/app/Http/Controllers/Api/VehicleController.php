<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Throwable;

class VehicleController extends Controller
{
    private const DISK = 'vehicles';

    private const STATUSES = ['available', 'unavailable', 'maintenance'];

    // Columns that may be written from the request
    private const FIELDS = [
        'vehicle_name',
        'plate_number',
        'vehicle_type',
        'description',
        'capacity',
        'seating_notes',
        'person_in_charge',
        'pic_contact_number',
        'pic_email',
        'status',
    ];

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    private function rules(?Vehicle $vehicle = null): array
    {
        // On update, fields are only validated when they are sent
        $presence = $vehicle ? ['sometimes', 'required'] : ['required'];

        return [
            'vehicle_name' => [...$presence, 'string', 'min:3', 'max:100'],

            'plate_number' => [
                ...$presence,
                'string',
                'max:20',
                Rule::unique('tbl_vehicles', 'plate_number')
                    ->ignore($vehicle?->vehicle_id, 'vehicle_id'),
            ],

            'vehicle_type' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],

            'capacity' => [...$presence, 'integer', 'min:1', 'max:100'],
            'seating_notes' => ['sometimes', 'nullable', 'string', 'max:150'],

            'person_in_charge' => ['sometimes', 'nullable', 'string', 'max:150'],
            'pic_contact_number' => ['sometimes', 'nullable', 'string', 'max:30'],
            'pic_email' => ['sometimes', 'nullable', 'email:rfc', 'max:255'],

            'status' => ['sometimes', 'nullable', Rule::in(self::STATUSES)],

            'image_path' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_image' => ['sometimes', 'boolean'],
        ];
    }

    private function messages(): array
    {
        return [
            'image_path.image' => 'Vehicle image must be an image.',
            'image_path.mimes' => 'Vehicle image must be JPG, JPEG, PNG or WEBP.',
            'image_path.max' => 'Vehicle image must not exceed 2MB.',
            'vehicle_name.required' => 'Vehicle name is required.',
            'plate_number.required' => 'Plate number is required.',
            'plate_number.unique' => 'A vehicle with this plate number already exists (it may be in the Trash Bin).',
            'capacity.required' => 'Seating capacity is required.',
            'capacity.integer' => 'Seating capacity must be a whole number.',
        ];
    }

    private function normalizePlate(Request $request): void
    {
        if ($request->has('plate_number')) {
            $request->merge([
                'plate_number' => strtoupper(trim((string) $request->input('plate_number'))),
            ]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Load All Active Vehicles
    |--------------------------------------------------------------------------
    */

    public function loadVehicles()
    {
        $vehicles = Vehicle::where('is_deleted', false)
            ->orderBy('vehicle_name')
            ->get();

        return response()->json([
            'message' => 'Vehicles retrieved successfully.',
            'data' => $vehicles,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Get Single Vehicle
    |--------------------------------------------------------------------------
    */

    public function getVehicle($vehicle_id)
    {
        $vehicle = Vehicle::where('is_deleted', false)->findOrFail($vehicle_id);

        return response()->json([
            'message' => 'Vehicle retrieved successfully.',
            'data' => $vehicle,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Store Vehicle
    |--------------------------------------------------------------------------
    */

    public function storeVehicle(Request $request)
    {
        $this->normalizePlate($request);

        $validated = $request->validate($this->rules(), $this->messages());

        $imagePath = null;

        try {
            if ($request->hasFile('image_path')) {
                $imagePath = $request->file('image_path')->store('', self::DISK);
            }

            $data = Arr::only($validated, self::FIELDS);
            $data['status'] = $data['status'] ?? 'available';
            $data['image_path'] = $imagePath;
            $data['is_deleted'] = false;

            $vehicle = Vehicle::create($data);
        } catch (Throwable $e) {
            // Remove the uploaded image if saving fails
            if ($imagePath) {
                Storage::disk(self::DISK)->delete($imagePath);
            }

            report($e);

            return response()->json([
                'message' => 'Failed to create vehicle.',
            ], 500);
        }

        return response()->json([
            'message' => 'Vehicle created successfully.',
            'data' => $vehicle->fresh(),
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Update Vehicle
    |--------------------------------------------------------------------------
    */

    public function updateVehicle(Request $request, $vehicle_id)
    {
        $vehicle = Vehicle::where('is_deleted', false)->findOrFail($vehicle_id);

        $this->normalizePlate($request);

        $validated = $request->validate($this->rules($vehicle), $this->messages());

        $oldImage = $vehicle->image_path;
        $newImage = null;
        $deleteOldImage = false;

        try {
            // Only fields that were sent are changed
            $data = Arr::only($validated, self::FIELDS);

            if (array_key_exists('status', $data) && $data['status'] === null) {
                unset($data['status']);
            }

            $vehicle->fill($data);

            if ($request->hasFile('image_path')) {
                $newImage = $request->file('image_path')->store('', self::DISK);
                $vehicle->image_path = $newImage;
                $deleteOldImage = !empty($oldImage);
            } elseif ($request->boolean('remove_image')) {
                $vehicle->image_path = null;
                $deleteOldImage = !empty($oldImage);
            }

            $vehicle->save();
        } catch (Throwable $e) {
            if ($newImage) {
                Storage::disk(self::DISK)->delete($newImage);
            }

            report($e);

            return response()->json([
                'message' => 'Failed to update vehicle.',
            ], 500);
        }

        // Delete the old image only after the update succeeded
        if ($deleteOldImage && $oldImage) {
            Storage::disk(self::DISK)->delete($oldImage);
        }

        // TODO (booking module): when status becomes unavailable or maintenance,
        // warn about pending/approved upcoming bookings for this vehicle.

        return response()->json([
            'message' => 'Vehicle updated successfully.',
            'data' => $vehicle->fresh(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Soft Delete Vehicle
    |--------------------------------------------------------------------------
    */

    public function destroyVehicle($vehicle_id)
    {
        $vehicle = Vehicle::where('is_deleted', false)->findOrFail($vehicle_id);

        // TODO (booking module): refuse when the vehicle has pending or
        // approved upcoming bookings.

        $vehicle->update(['is_deleted' => true]);

        return response()->json([
            'message' => 'Vehicle moved to trash successfully.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Load Trashed Vehicles
    |--------------------------------------------------------------------------
    */

    public function loadTrashVehicles()
    {
        $vehicles = Vehicle::where('is_deleted', true)
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'message' => 'Trashed vehicles retrieved successfully.',
            'data' => $vehicles,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Restore Vehicle
    |--------------------------------------------------------------------------
    */

    public function restoreVehicle($vehicle_id)
    {
        $vehicle = Vehicle::where('is_deleted', true)->findOrFail($vehicle_id);

        $vehicle->update(['is_deleted' => false]);

        return response()->json([
            'message' => 'Vehicle restored successfully.',
            'data' => $vehicle->fresh(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Permanently Delete Vehicle (only from the Trash Bin)
    |--------------------------------------------------------------------------
    */

    public function forceDeleteVehicle($vehicle_id)
    {
        $vehicle = Vehicle::where('is_deleted', true)->findOrFail($vehicle_id);

        $imagePath = $vehicle->image_path;

        try {
            $vehicle->delete();
        } catch (QueryException $e) {
            // 23000 = foreign key violation (vehicle still has bookings)
            if ((string) $e->getCode() === '23000') {
                return response()->json([
                    'message' => 'This vehicle still has booking records and cannot be permanently deleted.',
                ], 409);
            }

            report($e);

            return response()->json([
                'message' => 'Failed to permanently delete vehicle.',
            ], 500);
        }

        if ($imagePath) {
            Storage::disk(self::DISK)->delete($imagePath);
        }

        return response()->json([
            'message' => 'Vehicle permanently deleted.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Stream Vehicle Image (private disk)
    |--------------------------------------------------------------------------
    */

    public function showVehicleImage($vehicle_id)
    {
        $vehicle = Vehicle::where('is_deleted', false)->findOrFail($vehicle_id);

        if (
            !$vehicle->image_path ||
            !Storage::disk(self::DISK)->exists($vehicle->image_path)
        ) {
            return response()->json([
                'message' => 'Vehicle image not found.',
            ], 404);
        }

        // The image URL carries ?v=<updated_at>, so it is safe to cache
        return Storage::disk(self::DISK)->response(
            $vehicle->image_path,
            null,
            ['Cache-Control' => 'public, max-age=86400']
        );
    }
}
