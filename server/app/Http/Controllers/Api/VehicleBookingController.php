<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VehicleBooking;
use App\Permissions\AbilityRule;
use App\Permissions\ApprovalStage;
use App\Permissions\Permission;
use App\Permissions\PermissionCatalog;
use App\VehicleBookings\VehicleApprovalWorkflow;
use App\VehicleBookings\VehicleAssignmentService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VehicleBookingController extends Controller
{
    use ScopesQueriesByPermission;

    private function bookingRelations(): array
    {
        return ['office', 'requester', 'vehicle', 'driver', 'approvals.approver'];
    }

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

    public function getVehicleBooking($vehicle_booking_id)
    {
        $booking = VehicleBooking::with($this->bookingRelations())
            ->where('is_deleted', false)
            ->findOrFail($vehicle_booking_id);

        return response()->json([
            'message' => 'Vehicle booking retrieved successfully.',
            'data' => $booking,
        ], 200);
    }

    public function storeVehicleBooking(Request $request)
    {
        $validated = $this->validateBooking($request);

        $booking = DB::transaction(function () use ($request, $validated) {
            $data = $this->prepareBookingData($validated, $request, true);
            $data['status'] = 'pending';
            $data['approval_stage'] = ApprovalStage::OFFICE_HEAD;
            $data['vehicle_id'] = null;
            $data['driver_id'] = null;

            return VehicleBooking::create($data);
        });

        return response()->json([
            'message' => 'Vehicle booking request submitted successfully.',
            'data' => $booking->load($this->bookingRelations()),
        ], 201);
    }

    public function updateVehicleBooking(Request $request, $vehicle_booking_id)
    {
        $validated = $this->validateBooking($request);

        $booking = DB::transaction(function () use ($request, $validated, $vehicle_booking_id) {
            $booking = VehicleBooking::where('is_deleted', false)
                ->lockForUpdate()
                ->findOrFail($vehicle_booking_id);

            if (!$booking->isRequesterEditable()) {
                throw ValidationException::withMessages([
                    'status' => ['Only unreviewed pending vehicle bookings can be updated.'],
                ]);
            }

            $booking->update($this->prepareBookingData($validated, $request, false));

            return $booking;
        });

        return response()->json([
            'message' => 'Vehicle booking updated successfully.',
            'data' => $booking->fresh()->load($this->bookingRelations()),
        ], 200);
    }

    public function destroyVehicleBooking($vehicle_booking_id)
    {
        $booking = VehicleBooking::where('is_deleted', false)
            ->findOrFail($vehicle_booking_id);

        $booking->update(['is_deleted' => true]);

        return response()->json([
            'message' => 'Vehicle booking moved to Trash Bin.',
        ], 200);
    }

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

    public function restoreVehicleBooking($vehicle_booking_id)
    {
        $booking = VehicleBooking::where('is_deleted', true)
            ->findOrFail($vehicle_booking_id);

        $booking->update(['is_deleted' => false]);

        return response()->json([
            'message' => 'Vehicle booking restored successfully.',
            'data' => $booking->fresh()->load($this->bookingRelations()),
        ], 200);
    }

    public function forceDeleteVehicleBooking($vehicle_booking_id)
    {
        $booking = VehicleBooking::where('is_deleted', true)
            ->findOrFail($vehicle_booking_id);

        $booking->delete();

        return response()->json([
            'message' => 'Vehicle booking permanently deleted.',
        ], 200);
    }

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
            $booking = VehicleBooking::where('is_deleted', false)
                ->lockForUpdate()
                ->findOrFail($vehicle_booking_id);

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
            $booking = VehicleBooking::where('is_deleted', false)
                ->lockForUpdate()
                ->findOrFail($vehicle_booking_id);

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

    private function validateBooking(Request $request): array
    {
        $validated = $request->validate([
            'destination' => ['required', 'string', 'max:255'],
            'purpose' => ['required', 'string', 'max:200'],
            'remarks' => ['nullable', 'string'],
            'travel_date' => ['required', 'date', 'after_or_equal:today'],
            'expected_return_date' => ['required', 'date', 'after_or_equal:travel_date'],
            'departure_time' => ['required', 'date_format:H:i'],
            'expected_return_time' => ['required', 'date_format:H:i'],
            'passenger_count' => ['required', 'integer', 'min:1'],
            'passenger_details' => ['nullable', 'string'],
            'requested_by' => ['required', 'string', 'max:150'],
            'office_id' => [
                'nullable',
                'integer',
                Rule::exists('tbl_offices', 'office_id'),
            ],
            'email' => ['required', 'email', 'max:150'],
            'tel_number' => ['required', 'string', 'max:30'],
        ]);

        $start = Carbon::parse($validated['travel_date'] . ' ' . $validated['departure_time']);
        $end = Carbon::parse($validated['expected_return_date'] . ' ' . $validated['expected_return_time']);

        if (!$end->gt($start)) {
            throw ValidationException::withMessages([
                'expected_return_time' => [
                    'The expected return date and time must be after departure.',
                ],
            ]);
        }

        return $validated;
    }

    private function prepareBookingData(array $validated, Request $request, bool $creating): array
    {
        unset(
            $validated['requested_by_user_id'],
            $validated['vehicle_id'],
            $validated['driver_id'],
            $validated['status'],
            $validated['approval_stage'],
            $validated['approved_by'],
            $validated['approved_by_user_id'],
        );

        $actor = $request->user();

        if ($creating) {
            $validated['requested_by_user_id'] = $actor->user_id;
            $validated['office_id'] = $this->authorizedOfficeId(
                $actor,
                $validated['office_id'] ?? null,
            );
        } elseif (!$this->canAssignAnyOffice($actor)) {
            unset($validated['office_id']);
        }

        if (empty($validated['office_id']) && $creating) {
            throw ValidationException::withMessages([
                'office_id' => ['A requesting office is required.'],
            ]);
        }

        return $validated;
    }

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
}
