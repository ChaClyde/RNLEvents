<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Permissions\AbilityRule;
use App\Permissions\ApprovalStage;
use App\Permissions\Permission;
use App\Permissions\PermissionCatalog;
use App\Permissions\PermissionChecker;
use App\Scheduling\AdvanceBookingPolicy;
use App\Signatures\SignatureStorage;
use App\Models\Role;
use App\VehicleBookings\VehicleApprovalWorkflow;
use App\VehicleBookings\VehicleAssignmentService;
use App\VehicleBookings\VehicleUseSchedule;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VehicleBookingController extends Controller
{
    use ScopesQueriesByPermission;

    // Columns that may be written from the request
    private const FIELDS = [
        'office_id',
        'requested_by',
        'email',
        'tel_number',
        'destination',
        'purpose',
        'remarks',
        'travel_date',
        'departure_time',
        'expected_return_date',
        'expected_return_time',
        'passenger_count',
        'passenger_details',
        'vehicle_id',
        'driver_id',
    ];

    private function bookingRelations(): array
    {
        return ['office', 'requester', 'vehicle', 'driver', 'approvals.approver', 'attachments'];
    }

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    private function rules(): array
    {
        $earliest = app(AdvanceBookingPolicy::class)->earliestDate();

        return [
            'destination' => ['required', 'string', 'max:255'],
            'purpose' => ['required', 'string', 'max:200'],
            'remarks' => ['nullable', 'string'],

            'travel_date' => ['required', 'date', 'after_or_equal:'.$earliest],
            'expected_return_date' => ['required', 'date', 'after_or_equal:travel_date'],
            'departure_time' => ['required', 'date_format:H:i'],
            'expected_return_time' => ['required', 'date_format:H:i'],

            'passenger_count' => ['required', 'integer', 'min:1', 'max:200'],
            'passenger_details' => ['nullable', 'string'],

            'requested_by' => ['required', 'string', 'max:150'],
            'office_id' => ['nullable', 'integer', Rule::exists('tbl_offices', 'office_id')],
            'email' => ['required', 'email', 'max:150'],
            'tel_number' => ['required', 'string', 'max:30'],

            'driver_meal_amount' => ['prohibited'],
            'driver_meal_rate' => ['prohibited'],
            'meal_count' => ['prohibited'],
            'charge_area' => ['prohibited'],

            // Chosen from the vehicle / driver dropdowns (sent together or not at all)
            'vehicle_id' => [
                'nullable',
                'required_with:driver_id',
                'integer',
                Rule::exists('tbl_vehicles', 'vehicle_id')
                    ->where(fn ($query) => $query->where('is_deleted', false)),
            ],
            'driver_id' => [
                'nullable',
                'required_with:vehicle_id',
                'integer',
                Rule::exists('tbl_drivers', 'driver_id')
                    ->where(fn ($query) => $query->where('is_deleted', false)),
            ],
        ];
    }

    private function messages(): array
    {
        return [
            'vehicle_id.required_with' => 'Select a vehicle together with the driver.',
            'driver_id.required_with' => 'Select a driver together with the vehicle.',
            'vehicle_id.exists' => 'The selected vehicle is not available.',
            'driver_id.exists' => 'The selected driver is not available.',
            'travel_date.after_or_equal' => AdvanceBookingPolicy::MESSAGE,
        ];
    }

    private function validateBooking(Request $request): array
    {
        $validated = $request->validate($this->rules(), $this->messages());

        $start = Carbon::parse($validated['travel_date'] . ' ' . $validated['departure_time']);
        $end = Carbon::parse($validated['expected_return_date'] . ' ' . $validated['expected_return_time']);

        // Requires 'timezone' => 'Asia/Manila' in config/app.php
        if ($start->isPast()) {
            throw ValidationException::withMessages([
                'departure_time' => [
                    'The departure date and time cannot be in the past.',
                ],
            ]);
        }

        if (!$end->gt($start)) {
            throw ValidationException::withMessages([
                'expected_return_time' => [
                    'The expected return date and time must be after departure.',
                ],
            ]);
        }

        return $validated;
    }

    /*
    |--------------------------------------------------------------------------
    | Schedule Rules
    |--------------------------------------------------------------------------
    |
    | The chosen vehicle and driver must be free for the whole trip:
    | - the driver is not on leave or unavailable
    | - neither has an overlapping pending or approved booking
    |
    | Must be called inside DB::transaction(). The vehicle and driver rows are
    | locked so two requests for the same resource are serialized, even when
    | no booking rows exist yet.
    |
    */

    private function lockResources(?int $vehicleId, ?int $driverId): void
    {
        // Always vehicle first, then driver, so concurrent requests can't deadlock
        if ($vehicleId) {
            Vehicle::whereKey($vehicleId)->lockForUpdate()->first();
        }

        if ($driverId) {
            Driver::whereKey($driverId)->lockForUpdate()->first();
        }
    }

    private function assertResourcesFree(array $validated, ?int $ignoreBookingId = null): void
    {
        $vehicleId = !empty($validated['vehicle_id']) ? (int) $validated['vehicle_id'] : null;
        $driverId = !empty($validated['driver_id']) ? (int) $validated['driver_id'] : null;

        if (!$vehicleId && !$driverId) {
            return;
        }

        $this->lockResources($vehicleId, $driverId);

        $from = Carbon::parse($validated['travel_date'])->toDateString();
        $to = Carbon::parse($validated['expected_return_date'])->toDateString();
        $start = Carbon::parse($validated['travel_date'] . ' ' . $validated['departure_time']);
        $end = Carbon::parse($validated['expected_return_date'] . ' ' . $validated['expected_return_time']);

        $errors = [];

        if ($driverId) {
            $driverFree = Driver::where('is_deleted', false)
                ->whereKey($driverId)
                ->availableBetween($from, $to)
                ->exists();

            if (!$driverFree) {
                $errors['driver_id'][] = 'This driver is on leave or unavailable during the trip dates.';
            } elseif ($this->hasOverlap('driver_id', $driverId, $from, $to, $start, $end, $ignoreBookingId)) {
                $errors['driver_id'][] = 'This driver is already booked for an overlapping trip.';
            }
        }

        if ($vehicleId && $this->hasOverlap('vehicle_id', $vehicleId, $from, $to, $start, $end, $ignoreBookingId)) {
            $errors['vehicle_id'][] = 'This vehicle is already booked for an overlapping trip.';
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function hasOverlap(
        string $column,
        int $id,
        string $from,
        string $to,
        Carbon $start,
        Carbon $end,
        ?int $ignoreBookingId,
    ): bool {
        // Plain where() on DATE columns so the schedule indexes can be used.
        // Row locking is handled by lockResources() on the parent rows.
        return VehicleBooking::scheduleBlocking()
            ->where($column, $id)
            ->where('travel_date', '<=', $to)
            ->where('expected_return_date', '>=', $from)
            ->when($ignoreBookingId, fn ($q) => $q->where('vehicle_booking_id', '!=', $ignoreBookingId))
            ->get()
            ->contains(fn (VehicleBooking $b) => $b->overlapsTrip($start, $end));
    }

    /*
    |--------------------------------------------------------------------------
    | Office Access
    |--------------------------------------------------------------------------
    */

    private function canAssignAnyOffice(User $actor): bool
    {
        $actor->loadMissing('role');

        return PermissionCatalog::ruleFor($actor->role?->slug, Permission::USERS_VIEW)?->scope
            === AbilityRule::SCOPE_GLOBAL;
    }

    private function authorizedOfficeId(User $actor, mixed $submitted): ?int
    {
        if ($this->canAssignAnyOffice($actor) && $submitted) {
            return (int) $submitted;
        }

        return $actor->office_id ? (int) $actor->office_id : null;
    }

    private function prepareBookingData(array $validated, Request $request, bool $creating): array
    {
        $data = Arr::only($validated, self::FIELDS);
        $actor = $request->user();

        $data['vehicle_id'] = !empty($data['vehicle_id']) ? (int) $data['vehicle_id'] : null;
        $data['driver_id'] = !empty($data['driver_id']) ? (int) $data['driver_id'] : null;

        if ($creating) {
            $data['requested_by_user_id'] = $actor->user_id;
            $data['office_id'] = $this->authorizedOfficeId($actor, $data['office_id'] ?? null);

            if (empty($data['office_id'])) {
                throw ValidationException::withMessages([
                    'office_id' => ['A requesting office is required.'],
                ]);
            }
        } elseif (!$this->canAssignAnyOffice($actor)) {
            unset($data['office_id']);
        }

        $quote = VehicleUseSchedule::mealQuote(
            (string) ($data['destination'] ?? ''),
            (string) ($data['travel_date'] ?? ''),
            (string) ($data['expected_return_date'] ?? ''),
            (string) ($data['departure_time'] ?? '08:00'),
            (string) ($data['expected_return_time'] ?? '17:00'),
        );

        $data['charge_area'] = $quote['area'] ?? null;
        $data['driver_meal_rate'] = $quote['meal_rate'] ?? null;
        $data['meal_count'] = $quote['meal_count'] ?? null;
        $data['driver_meal_amount'] = $quote['driver_meal_amount'] ?? null;
        $this->assertPassengerCapacity($data);
        $lines = VehicleUseSchedule::chargeLines(
            (string) ($data['destination'] ?? ''),
            (string) ($data['travel_date'] ?? ''),
            (string) ($data['expected_return_date'] ?? ''),
            (int) ($data['passenger_count'] ?? 1),
            (string) ($data['departure_time'] ?? '08:00'),
            (string) ($data['expected_return_time'] ?? '17:00'),
        );
        $data['charge_lines'] = $lines;
        $data['charge_total'] = VehicleUseSchedule::total($lines);
        $data['calculation_confirmed_at'] = null;
        $data['calculation_confirmed_stage'] = null;

        return $data;
    }

    private function assertPassengerCapacity(array $data): void
    {
        $vehicleId = !empty($data['vehicle_id']) ? (int) $data['vehicle_id'] : null;

        if (!$vehicleId) {
            return;
        }

        $capacity = (int) Vehicle::whereKey($vehicleId)->value('capacity');

        if ($capacity > 0 && (int) ($data['passenger_count'] ?? 0) > $capacity) {
            throw ValidationException::withMessages([
                'passenger_count' => ["This vehicle seats {$capacity} passengers. Enter {$capacity} or fewer."],
            ]);
        }
    }

    private function attachRequesterSignature(VehicleBooking $booking, User $actor): void
    {
        $actor->loadMissing('role');

        if (!in_array($actor->role?->slug, [Role::FACULTY_STAFF, Role::STUDENT_REPUBLIC], true)) {
            return;
        }

        $snapshot = SignatureStorage::copyForRequester($actor);

        $booking->forceFill([
            'requester_signature_path' => $snapshot['signature_path'],
            'requester_signature_mime' => $snapshot['signature_mime'],
            'requester_signer_name' => $snapshot['signer_name'],
            'requester_signer_position' => $snapshot['signer_position'],
        ])->save();
    }

    /*
    |--------------------------------------------------------------------------
    | Scoped Lookup
    |--------------------------------------------------------------------------
    |
    | Single-booking lookups must respect the same permission scope as the list,
    | otherwise a booking from another office can be opened or changed by ID.
    |
    */

    private function findAccessibleBooking(Request $request, $id, bool $lock = false): VehicleBooking
    {
        $query = VehicleBooking::where('is_deleted', false);

        $query = $this->constrainByPermission(
            $query,
            $request->user(),
            Permission::VEHICLE_BOOKINGS_VIEW,
            Permission::VEHICLE_APPROVALS_VIEW,
        );

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->findOrFail($id);
    }

    /*
    |--------------------------------------------------------------------------
    | Load Active Bookings
    |--------------------------------------------------------------------------
    */

    public function loadVehicleBookings(Request $request)
    {
        $query = VehicleBooking::with([
            'office:office_id,office_name,office_code',
            'requester',
            'vehicle',
            'driver',
            'approvals.approver',
        ])->where('is_deleted', false);

        $query = $this->constrainByPermission(
            $query,
            $request->user(),
            Permission::VEHICLE_BOOKINGS_VIEW,
            Permission::VEHICLE_APPROVALS_VIEW,
        );

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('purpose', 'like', "%{$search}%")
                    ->orWhere('destination', 'like', "%{$search}%")
                    ->orWhere('requested_by', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('office', function ($office) use ($search) {
                        $office->where('office_name', 'like', "%{$search}%")
                            ->orWhere('office_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('vehicle', function ($vehicle) use ($search) {
                        $vehicle->where('vehicle_name', 'like', "%{$search}%")
                            ->orWhere('plate_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('driver', function ($driver) use ($search) {
                        $driver->where('driver_name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('approval_stage')) {
            $query->where('approval_stage', $request->approval_stage);
        }

        if (
            $request->filled('office_id')
            && $this->canAssignAnyOffice($request->user())
        ) {
            $query->where('office_id', $request->office_id);
        }

        return response()->json([
            'message' => 'Vehicle bookings loaded successfully.',
            'data' => $query->orderByDesc('created_at')->get(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Requests waiting after the Unit Head has approved
    |--------------------------------------------------------------------------
    */

    public function loadAwaitingMyApproval(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');

        $stages = PermissionCatalog::ruleFor(
            $user->role?->slug,
            Permission::VEHICLE_APPROVALS_APPROVE
        )?->approvalStages ?? [];

        $query = VehicleBooking::with($this->bookingRelations())
            ->where('is_deleted', false)
            ->where('status', 'pending')
            ->whereIn('approval_stage', $stages)
            ->where(function ($q) use ($user) {
                $q->whereNull('requested_by_user_id')
                    ->orWhere('requested_by_user_id', '!=', $user->user_id);
            });

        $query = app(PermissionChecker::class)
            ->constrainQuery($query, $user, Permission::VEHICLE_APPROVALS_APPROVE);

        return response()->json([
            'message' => 'Requests awaiting your approval loaded successfully.',
            'data' => $query->orderBy('created_at')->get(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Get Single Booking
    |--------------------------------------------------------------------------
    */

    public function getVehicleBooking(Request $request, $vehicle_booking_id)
    {
        $booking = $this->findAccessibleBooking($request, $vehicle_booking_id)
            ->load($this->bookingRelations());

        return response()->json([
            'message' => 'Vehicle booking retrieved successfully.',
            'data' => $booking,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Store Booking
    |--------------------------------------------------------------------------
    */

    public function storeVehicleBooking(Request $request)
    {
        $validated = $this->validateBooking($request);

        $booking = DB::transaction(function () use ($request, $validated) {
            // Re-check inside the transaction so two requests cannot take the same slot
            $this->assertResourcesFree($validated);

            $data = $this->prepareBookingData($validated, $request, true);
            $data['status'] = 'pending';
            $data['approval_stage'] = ApprovalStage::OFFICE_HEAD;
            $data['is_deleted'] = false;

            return VehicleBooking::create($data);
        });

        $this->attachRequesterSignature($booking, $request->user());

        app(\App\Notifications\SystemNotifier::class)->bookingSubmitted($booking, $request->user());

        return response()->json([
            'message' => 'Vehicle booking request submitted successfully.',
            'data' => $booking->load($this->bookingRelations()),
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Update Booking
    |--------------------------------------------------------------------------
    */

    public function updateVehicleBooking(Request $request, $vehicle_booking_id)
    {
        $validated = $this->validateBooking($request);

        $booking = DB::transaction(function () use ($request, $validated, $vehicle_booking_id) {
            $booking = $this->findAccessibleBooking($request, $vehicle_booking_id, true);

            if (!$booking->isRequesterEditable()) {
                throw ValidationException::withMessages([
                    'status' => ['Only unreviewed pending vehicle bookings can be updated.'],
                ]);
            }

            $toCheck = $validated;

            $this->assertResourcesFree($toCheck, (int) $booking->vehicle_booking_id);

            $booking->update($this->prepareBookingData($validated, $request, false));

            return $booking;
        });

        return response()->json([
            'message' => 'Vehicle booking updated successfully.',
            'data' => $booking->fresh()->load($this->bookingRelations()),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Soft Delete Booking
    |--------------------------------------------------------------------------
    */

    public function destroyVehicleBooking(Request $request, $vehicle_booking_id)
    {
        $booking = $this->findAccessibleBooking($request, $vehicle_booking_id);

        $booking->update(['is_deleted' => true]);

        return response()->json([
            'message' => 'Vehicle booking moved to Trash Bin.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Load Trashed Bookings
    |--------------------------------------------------------------------------
    */

    public function loadTrash()
    {
        $bookings = VehicleBooking::with($this->bookingRelations())
            ->where('is_deleted', true)
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'message' => 'Vehicle booking trash loaded successfully.',
            'data' => $bookings,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Restore Booking
    |--------------------------------------------------------------------------
    |
    | A trashed booking stops blocking its vehicle and driver, so the schedule
    | is re-checked before it comes back.
    |
    */

    public function restoreVehicleBooking($vehicle_booking_id)
    {
        $booking = DB::transaction(function () use ($vehicle_booking_id) {
            $booking = VehicleBooking::where('is_deleted', true)
                ->lockForUpdate()
                ->findOrFail($vehicle_booking_id);

            if (
                $booking->hasAssignment()
                && in_array($booking->status, ['pending', 'approved'], true)
            ) {
                $this->assertResourcesFree([
                    'vehicle_id' => $booking->vehicle_id,
                    'driver_id' => $booking->driver_id,
                    'travel_date' => $booking->travel_date->toDateString(),
                    'departure_time' => substr((string) $booking->departure_time, 0, 5),
                    'expected_return_date' => $booking->expected_return_date->toDateString(),
                    'expected_return_time' => substr((string) $booking->expected_return_time, 0, 5),
                ], (int) $booking->vehicle_booking_id);
            }

            $booking->update(['is_deleted' => false]);

            return $booking;
        });

        return response()->json([
            'message' => 'Vehicle booking restored successfully.',
            'data' => $booking->fresh()->load($this->bookingRelations()),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Permanently Delete Booking (only from the Trash Bin)
    |--------------------------------------------------------------------------
    */

    public function forceDeleteVehicleBooking($vehicle_booking_id)
    {
        $booking = VehicleBooking::where('is_deleted', true)
            ->findOrFail($vehicle_booking_id);

        $booking->delete();

        return response()->json([
            'message' => 'Vehicle booking permanently deleted.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Charge breakdown (Vehicle Admin and Admin Approvals)
    |--------------------------------------------------------------------------
    */

    public function updateChargeCalculation(Request $request, $vehicle_booking_id)
    {
        $actor = $request->user();
        $actor->loadMissing('role');
        $slug = $actor->role?->slug;

        abort_unless(in_array($slug, [Role::VEHICLE_ADMIN, Role::ADMIN_APPROVALS], true), 403, 'This action is unauthorized.');

        $validated = $request->validate([
            'confirm' => ['required', 'boolean'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.id' => ['required', 'string', 'max:40'],
            'lines.*.label' => ['required', 'string', 'max:150'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0', 'max:100000'],
            'lines.*.unit_amount' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'lines.*.removable' => ['required', 'boolean'],
        ]);

        $booking = DB::transaction(function () use ($request, $actor, $slug, $validated, $vehicle_booking_id) {
            $booking = $this->findAccessibleBooking($request, $vehicle_booking_id, true);
            $booking = VehicleBooking::whereKey($booking->vehicle_booking_id)->lockForUpdate()->firstOrFail();

            $expectedStage = $slug === Role::VEHICLE_ADMIN
                ? ApprovalStage::VEHICLE_ADMIN
                : ApprovalStage::VEHICLE_APPROVAL;

            if ($booking->status !== 'pending' || $booking->approval_stage !== $expectedStage) {
                throw ValidationException::withMessages([
                    'fee' => ['The charge breakdown can be edited only while this request is on your approval step.'],
                ]);
            }

            $existingFixed = collect($booking->charge_lines ?? [])
                ->filter(fn ($line) => empty($line['removable']))
                ->pluck('id');
            $incoming = collect($validated['lines']);

            if ($existingFixed->diff($incoming->pluck('id'))->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'lines' => ['Official fare lines cannot be removed. Remove only an additional price.'],
                ]);
            }

            foreach ($incoming as $line) {
                $known = $existingFixed->contains($line['id']);
                if (!$known && !$line['removable']) {
                    throw ValidationException::withMessages([
                        'lines' => ['An added price must be marked as an additional charge.'],
                    ]);
                }
            }

            $stored = collect($booking->charge_lines ?? [])->keyBy('id');

            $lines = $incoming->map(function ($line) use ($stored, $actor) {
                $previous = $stored->get($line['id']);
                $removable = (bool) $line['removable'];
                $built = [
                    'id' => $line['id'],
                    'label' => $line['label'],
                    'detail' => VehicleUseSchedule::lineDetail((string) $line['id']),
                    'quantity' => round((float) $line['quantity'], 2),
                    'unit_amount' => round((float) $line['unit_amount'], 2),
                    'removable' => $removable,
                ];

                foreach (['meal_rate', 'day_count', 'meal_breakdown', 'meal_names'] as $key) {
                    if (is_array($previous) && array_key_exists($key, $previous)) {
                        $built[$key] = $previous[$key];
                    }
                }

                if ($removable) {
                    $changed = !is_array($previous)
                        || ($previous['label'] ?? null) !== $line['label']
                        || (float) ($previous['quantity'] ?? 0) !== (float) $line['quantity']
                        || (float) ($previous['unit_amount'] ?? 0) !== (float) $line['unit_amount'];
                    $built['added_by_name'] = $changed ? $actor->full_name : ($previous['added_by_name'] ?? $actor->full_name);
                    $built['added_at'] = $changed ? now()->toIso8601String() : ($previous['added_at'] ?? now()->toIso8601String());
                }

                return $built;
            })->values()->all();

            $booking->update([
                'charge_lines' => $lines,
                'charge_total' => VehicleUseSchedule::total($lines),
                'calculation_confirmed_at' => $validated['confirm'] ? now() : null,
                'calculation_confirmed_stage' => $validated['confirm'] ? $booking->approval_stage : null,
            ]);

            return $booking;
        });

        return response()->json([
            'message' => $validated['confirm']
                ? 'Vehicle charge breakdown confirmed.'
                : 'Vehicle charge breakdown updated.',
            'data' => $booking->fresh()->load($this->bookingRelations()),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Approve / Reject / Cancel
    |--------------------------------------------------------------------------
    */

    public function updateVehicleBookingStatus(Request $request, $vehicle_booking_id)
    {
        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['approved', 'rejected', 'cancelled']),
            ],
            'approval_remarks' => [
                'required_if:status,rejected',
                'nullable',
                'string',
            ],
            'cancellation_reason' => [
                'required_if:status,cancelled',
                'nullable',
                'string',
            ],
        ]);

        $booking = DB::transaction(function () use ($request, $validated, $vehicle_booking_id) {
            $booking = $this->findAccessibleBooking($request, $vehicle_booking_id, true);

            return app(VehicleApprovalWorkflow::class)->apply(
                $request->user(),
                $booking,
                $validated['status'],
                $validated,
            );
        });

        $booking = $booking->fresh()->load($this->bookingRelations());

        return response()->json([
            'message' => $this->statusMessage($booking, $validated['status']),
            'data' => $booking,
        ], 200);
    }

    private function statusMessage(VehicleBooking $booking, string $requested): string
    {
        if ($requested === 'rejected') {
            return 'Vehicle booking rejected.';
        }

        if ($requested === 'cancelled') {
            return 'Vehicle booking cancelled.';
        }

        if ($booking->status === 'approved') {
            return 'Vehicle booking approved.';
        }

        return 'Vehicle booking advanced to the next approval stage.';
    }

    /*
    |--------------------------------------------------------------------------
    | Assign Vehicle and Driver (approver step)
    |--------------------------------------------------------------------------
    */

    public function assignVehicleBooking(Request $request, $vehicle_booking_id)
    {
        $validated = $request->validate([
            'vehicle_id' => [
                'required',
                'integer',
                Rule::exists('tbl_vehicles', 'vehicle_id')
                    ->where(fn ($query) => $query->where('is_deleted', false)),
            ],
            'driver_id' => [
                'required',
                'integer',
                Rule::exists('tbl_drivers', 'driver_id')
                    ->where(fn ($query) => $query->where('is_deleted', false)),
            ],
        ]);

        $booking = DB::transaction(function () use ($request, $validated, $vehicle_booking_id) {
            $booking = $this->findAccessibleBooking($request, $vehicle_booking_id, true);

            app(VehicleApprovalWorkflow::class)->assertCanAssign($request->user(), $booking);

            return app(VehicleAssignmentService::class)->assign(
                $request->user(),
                $booking,
                (int) $validated['vehicle_id'],
                (int) $validated['driver_id'],
            );
        });

        return response()->json([
            'message' => 'Vehicle and driver assigned successfully.',
            'data' => $booking->fresh()->load($this->bookingRelations()),
        ], 200);
    }
}