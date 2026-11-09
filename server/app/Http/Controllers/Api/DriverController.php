<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
// use App\Services\ActivityLogger;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DriverController extends Controller
{
    private const STATUSES = ['Available', 'On Leave', 'Sick Leave', 'Unavailable'];

    // Columns that may be written from the request
    private const FIELDS = [
        'driver_name',
        'contact_number',
        'email',
        'license_number',
        'license_expiry',
        'is_reliever',
        'default_vehicle_id',
        'driver_status',
        'status_remarks',
        'status_start_date',
        'status_end_date',
    ];

    private const VEHICLE_RELATION = 'defaultVehicle:vehicle_id,vehicle_name,plate_number';

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    private function rules(?Driver $driver = null): array
    {
        // On update, fields are only validated when they are sent
        $presence = $driver ? ['sometimes', 'required'] : ['required'];

        return [
            'driver_name' => [...$presence, 'string', 'min:3', 'max:100'],

            'contact_number' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['sometimes', 'nullable', 'email:rfc', 'max:255'],

            'license_number' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
                Rule::unique('tbl_drivers', 'license_number')
                    ->ignore($driver?->driver_id, 'driver_id'),
            ],
            'license_expiry' => ['sometimes', 'nullable', 'date_format:Y-m-d'],

            'is_reliever' => ['sometimes', 'boolean'],

            'default_vehicle_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('tbl_vehicles', 'vehicle_id')->where('is_deleted', false),
            ],

            'driver_status' => ['sometimes', 'nullable', Rule::in(self::STATUSES)],
            'status_remarks' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status_start_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'status_end_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ];
    }

    private function messages(): array
    {
        return [
            'driver_name.required' => 'Driver name is required.',
            'driver_name.min' => 'Driver name must be at least 3 characters.',
            'driver_name.max' => 'Driver name must not exceed 100 characters.',
            'license_number.unique' => 'A driver with this license number already exists (they may be in the Trash Bin).',
            'default_vehicle_id.exists' => 'The selected vehicle is not available.',
            'driver_status.in' => 'Invalid driver status.',
            'status_remarks.max' => 'Remarks must not exceed 255 characters.',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Status Rules
    |--------------------------------------------------------------------------
    |
    | - The end date cannot be before the start date.
    | - An "Available" driver has no unavailability period or remarks.
    |
    */

    private function applyStatusRules(array $data, ?Driver $driver = null): array
    {
        $status = $data['driver_status'] ?? $driver?->driver_status ?? 'Available';

        $start = array_key_exists('status_start_date', $data)
            ? $data['status_start_date']
            : $driver?->status_start_date?->toDateString();

        $end = array_key_exists('status_end_date', $data)
            ? $data['status_end_date']
            : $driver?->status_end_date?->toDateString();

        if ($start && $end && $end < $start) {
            throw ValidationException::withMessages([
                'status_end_date' => ['The end date must be on or after the start date.'],
            ]);
        }

        if ($status === 'Available') {
            $data['status_start_date'] = null;
            $data['status_end_date'] = null;
            $data['status_remarks'] = null;
        }

        return $data;
    }

    /*
    |--------------------------------------------------------------------------
    | Load Active Drivers
    |--------------------------------------------------------------------------
    |
    | Optional ?available_on=YYYY-MM-DD returns only drivers who can be
    | assigned on that date (leave status and license considered).
    |
    */

    public function loadDrivers(Request $request)
    {
        $query = Driver::with(self::VEHICLE_RELATION)
            ->where('is_deleted', false);

        if ($request->filled('available_on')) {
            $request->validate([
                'available_on' => ['date_format:Y-m-d'],
            ]);

            $query->availableOn($request->input('available_on'));
        }

        return response()->json([
            'message' => 'Drivers retrieved successfully.',
            'data' => $query->orderBy('driver_name')->get(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Get Single Driver
    |--------------------------------------------------------------------------
    */

    public function getDriver($driver_id)
    {
        $driver = Driver::with(self::VEHICLE_RELATION)
            ->where('is_deleted', false)
            ->findOrFail($driver_id);

        return response()->json([
            'message' => 'Driver retrieved successfully.',
            'data' => $driver,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Store Driver
    |--------------------------------------------------------------------------
    */

    public function storeDriver(Request $request)
    {
        $validated = $request->validate($this->rules(), $this->messages());

        $data = Arr::only($validated, self::FIELDS);
        $data['driver_status'] = $data['driver_status'] ?? 'Available';
        $data = $this->applyStatusRules($data);
        $data['is_deleted'] = false;

        $driver = Driver::create($data);

        // $this->log($request, 'created', $driver);

        return response()->json([
            'message' => 'Driver successfully created.',
            'data' => $driver->fresh()->load(self::VEHICLE_RELATION),
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Update Driver
    |--------------------------------------------------------------------------
    */

    public function updateDriver(Request $request, $driver_id)
    {
        $driver = Driver::where('is_deleted', false)->findOrFail($driver_id);

        $validated = $request->validate($this->rules($driver), $this->messages());

        // Only fields that were sent are changed
        $data = Arr::only($validated, self::FIELDS);

        if (array_key_exists('driver_status', $data) && $data['driver_status'] === null) {
            unset($data['driver_status']);
        }

        $data = $this->applyStatusRules($data, $driver);

        $driver->update($data);

        // TODO (booking module): when the driver becomes unavailable, warn about
        // approved trips already assigned to them in that period.

        // $this->log($request, 'updated', $driver);

        return response()->json([
            'message' => 'Driver successfully updated.',
            'data' => $driver->fresh()->load(self::VEHICLE_RELATION),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Soft Delete Driver
    |--------------------------------------------------------------------------
    */

    public function destroyDriver(Request $request, $driver_id)
    {
        $driver = Driver::where('is_deleted', false)->findOrFail($driver_id);

        // TODO (booking module): refuse when the driver is assigned to
        // pending or approved upcoming trips.

        $driver->update(['is_deleted' => true]);

        // $this->log($request, 'deleted', $driver);

        return response()->json([
            'message' => 'Driver moved to trash successfully.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Load Trashed Drivers
    |--------------------------------------------------------------------------
    */

    public function loadTrashDrivers()
    {
        $drivers = Driver::with(self::VEHICLE_RELATION)
            ->where('is_deleted', true)
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'message' => 'Trashed drivers retrieved successfully.',
            'data' => $drivers,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Restore Driver
    |--------------------------------------------------------------------------
    */

    public function restoreDriver(Request $request, $driver_id)
    {
        $driver = Driver::where('is_deleted', true)->findOrFail($driver_id);

        $driver->update(['is_deleted' => false]);

        // $this->log($request, 'restored', $driver);

        return response()->json([
            'message' => 'Driver restored successfully.',
            'data' => $driver->fresh()->load(self::VEHICLE_RELATION),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Permanently Delete Driver (only from the Trash Bin)
    |--------------------------------------------------------------------------
    */

    public function forceDeleteDriver(Request $request, $driver_id)
    {
        $driver = Driver::where('is_deleted', true)->findOrFail($driver_id);

        try {
            $driver->delete();
        } catch (QueryException $e) {
            // 23000 = foreign key violation (driver still has trip records)
            if ((string) $e->getCode() === '23000') {
                return response()->json([
                    'message' => 'This driver still has trip records and cannot be permanently deleted.',
                ], 409);
            }

            report($e);

            return response()->json([
                'message' => 'Failed to permanently delete driver.',
            ], 500);
        }

        // $this->log($request, 'force_deleted', $driver);

        return response()->json([
            'message' => 'Driver permanently deleted.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Activity Log (enable together with App\Services\ActivityLogger)
    |--------------------------------------------------------------------------
    */

    // private function log(Request $request, string $action, Driver $driver): void
    // {
    //     ActivityLogger::log(
    //         $request,
    //         $action,
    //         'driver',
    //         sprintf('%s driver: %s', ucfirst(str_replace('_', ' ', $action)), $driver->driver_name),
    //         $driver->driver_id,
    //         $driver->driver_name
    //     );
    // }
}
