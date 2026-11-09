<?php

namespace App\Reports;

use App\Models\User;
use App\Models\VehicleBooking;
use App\Permissions\Permission;
use App\Permissions\PermissionChecker;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class VehicleReportQuery
{
    public const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

    public const SORTABLE = [
        'vehicle_booking_id',
        'requested_by',
        'destination',
        'purpose',
        'status',
        'approval_stage',
        'travel_date',
        'expected_return_date',
        'passenger_count',
        'office_name',
        'vehicle_name',
        'driver_name',
    ];

    public function authorize(User $user): void
    {
        abort_unless($user->allows(Permission::REPORTS_VIEW), 403, 'This action is unauthorized.');
        abort_unless($this->canAccessVehicleReports($user), 403, 'This action is unauthorized.');
    }

    public function canAccessVehicleReports(User $user): bool
    {
        return $user->allows(Permission::REPORTS_VIEW_ALL)
            || $user->allows(Permission::REPORTS_VIEW_VEHICLE)
            || $user->allows(Permission::REPORTS_VIEW_OFFICE);
    }

    public function canFilterOffices(User $user): bool
    {
        return $user->allows(Permission::REPORTS_VIEW_ALL)
            || $user->allows(Permission::REPORTS_VIEW_VEHICLE);
    }

    /**
     * @return array<string, mixed>
     */
    public function validatedFilters(Request $request): array
    {
        return $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'in:'.implode(',', self::STATUSES)],
            'office_id' => ['nullable', 'integer'],
            'vehicle_id' => ['nullable', 'integer'],
            'driver_id' => ['nullable', 'integer'],
            'destination' => ['nullable', 'string', 'max:150'],
            'search' => ['nullable', 'string', 'max:150'],
            'list' => ['nullable', 'in:upcoming,past'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'sort' => ['nullable', 'in:'.implode(',', self::SORTABLE)],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);
    }

    public function bookings(User $user, array $filters): Builder
    {
        $query = VehicleBooking::query()->where('tbl_vehicle_bookings.is_deleted', false);
        $query = $this->constrain($query, $user);

        return $this->applyFilters($query, $user, $filters);
    }

    private function constrain(Builder $query, User $user): Builder
    {
        $checker = app(PermissionChecker::class);
        $columns = [
            'office_id' => 'tbl_vehicle_bookings.office_id',
            'owner_id' => 'tbl_vehicle_bookings.requested_by_user_id',
        ];

        if ($user->allows(Permission::REPORTS_VIEW_ALL) || $user->allows(Permission::REPORTS_VIEW_VEHICLE)) {
            if ($user->allows(Permission::VEHICLE_BOOKINGS_VIEW)) {
                return $checker->constrainQuery($query, $user, Permission::VEHICLE_BOOKINGS_VIEW, $columns);
            }

            if ($user->allows(Permission::VEHICLE_APPROVALS_VIEW)) {
                return $checker->constrainQuery($query, $user, Permission::VEHICLE_APPROVALS_VIEW, $columns);
            }

            return $query;
        }

        if ($user->allows(Permission::REPORTS_VIEW_OFFICE)) {
            return $checker->constrainQuery($query, $user, Permission::REPORTS_VIEW_OFFICE, $columns);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(Builder $query, User $user, array $filters): Builder
    {
        $start = $filters['start_date'] ?? null;
        $end = $filters['end_date'] ?? null;

        if ($start) {
            $query->whereDate('tbl_vehicle_bookings.expected_return_date', '>=', $start);
        }

        if ($end) {
            $query->whereDate('tbl_vehicle_bookings.travel_date', '<=', $end);
        }

        if (!empty($filters['status'])) {
            $query->where('tbl_vehicle_bookings.status', $filters['status']);
        }

        if (!empty($filters['vehicle_id'])) {
            $query->where('tbl_vehicle_bookings.vehicle_id', (int) $filters['vehicle_id']);
        }

        if (!empty($filters['driver_id'])) {
            $query->where('tbl_vehicle_bookings.driver_id', (int) $filters['driver_id']);
        }

        $destination = trim((string) ($filters['destination'] ?? ''));
        if ($destination !== '') {
            $query->where('tbl_vehicle_bookings.destination', 'like', "%{$destination}%");
        }

        $officeId = $this->authorizedOfficeId($user, $filters['office_id'] ?? null);
        if ($officeId !== null) {
            $query->where('tbl_vehicle_bookings.office_id', $officeId);
        }

        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $query->where(function (Builder $inner) use ($search) {
                $inner->where('tbl_vehicle_bookings.purpose', 'like', "%{$search}%")
                    ->orWhere('tbl_vehicle_bookings.requested_by', 'like', "%{$search}%")
                    ->orWhere('tbl_vehicle_bookings.destination', 'like', "%{$search}%")
                    ->orWhereHas('vehicle', function (Builder $vehicle) use ($search) {
                        $vehicle->where('vehicle_name', 'like', "%{$search}%")
                            ->orWhere('plate_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('driver', function (Builder $driver) use ($search) {
                        $driver->where('driver_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('office', function (Builder $office) use ($search) {
                        $office->where('office_name', 'like', "%{$search}%")
                            ->orWhere('office_code', 'like', "%{$search}%");
                    });
            });
        }

        $list = $filters['list'] ?? null;
        if ($list === 'upcoming') {
            $query->where('tbl_vehicle_bookings.status', 'approved')
                ->whereDate('tbl_vehicle_bookings.expected_return_date', '>=', now()->toDateString());
        }

        if ($list === 'past') {
            $query->whereDate('tbl_vehicle_bookings.expected_return_date', '<', now()->toDateString());
        }

        return $query;
    }

    public function authorizedOfficeId(User $user, mixed $requestedOfficeId): ?int
    {
        if (!$this->canFilterOffices($user)) {
            return $user->office_id ? (int) $user->office_id : null;
        }

        if ($requestedOfficeId === null || $requestedOfficeId === '') {
            return null;
        }

        return (int) $requestedOfficeId;
    }

    public function sortColumn(array $filters): string
    {
        $sort = $filters['sort'] ?? 'travel_date';

        if (!in_array($sort, self::SORTABLE, true)) {
            return 'tbl_vehicle_bookings.travel_date';
        }

        return match ($sort) {
            'office_name' => 'tbl_offices.office_name',
            'vehicle_name' => 'tbl_vehicles.vehicle_name',
            'driver_name' => 'tbl_drivers.driver_name',
            default => 'tbl_vehicle_bookings.'.$sort,
        };
    }

    public function sortDirection(array $filters): string
    {
        return ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
    }
}
