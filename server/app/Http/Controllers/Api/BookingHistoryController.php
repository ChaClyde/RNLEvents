<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventBooking;
use App\Models\VehicleBooking;
use App\Permissions\Permission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class BookingHistoryController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->allows(Permission::SYSTEM_HISTORY_VIEW), 403, 'This action is unauthorized.');

        $filters = $request->validate([
            'module' => ['nullable', 'in:events,vehicles'],
            'status' => ['nullable', 'in:approved,rejected'],
            'search' => ['nullable', 'string', 'max:150'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $module = $filters['module'] ?? 'events';
        $perPage = (int) ($filters['per_page'] ?? 10);

        $paginator = $module === 'vehicles'
            ? $this->vehicles($filters)->paginate($perPage)
            : $this->events($filters)->paginate($perPage);

        return response()->json([
            'message' => 'Booking history loaded.',
            'data' => collect($paginator->items())->map(
                fn ($row) => $module === 'vehicles'
                    ? $this->vehicleRow($row)
                    : $this->eventRow($row)
            )->values(),
            'summary' => [
                'events_approved' => $this->events([])->where('tbl_event_bookings.status', 'approved')->count(),
                'events_rejected' => $this->events([])->where('tbl_event_bookings.status', 'rejected')->count(),
                'vehicles_approved' => $this->vehicles([])->where('tbl_vehicle_bookings.status', 'approved')->count(),
                'vehicles_rejected' => $this->vehicles([])->where('tbl_vehicle_bookings.status', 'rejected')->count(),
            ],
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function events(array $filters): Builder
    {
        $query = EventBooking::query()
            ->where('tbl_event_bookings.is_deleted', false)
            ->whereIn('tbl_event_bookings.status', ['approved', 'rejected'])
            ->leftJoin('tbl_offices', 'tbl_offices.office_id', '=', 'tbl_event_bookings.office_id')
            ->leftJoin('tbl_venues', 'tbl_venues.venue_id', '=', 'tbl_event_bookings.venue_id')
            ->select([
                'tbl_event_bookings.event_booking_id',
                'tbl_event_bookings.purpose',
                'tbl_event_bookings.requested_by',
                'tbl_event_bookings.status',
                'tbl_event_bookings.approval_remarks',
                'tbl_event_bookings.date_start',
                'tbl_event_bookings.date_end',
                'tbl_event_bookings.updated_at',
                'tbl_offices.office_name',
                'tbl_venues.venue',
            ]);

        $this->applyStatus($query, 'tbl_event_bookings.status', $filters);
        $this->applySearch($query, $filters, [
            'tbl_event_bookings.purpose',
            'tbl_event_bookings.requested_by',
            'tbl_offices.office_name',
            'tbl_venues.venue',
        ]);

        return $query
            ->orderByDesc('tbl_event_bookings.updated_at')
            ->orderByDesc('tbl_event_bookings.event_booking_id');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function vehicles(array $filters): Builder
    {
        $query = VehicleBooking::query()
            ->where('tbl_vehicle_bookings.is_deleted', false)
            ->whereIn('tbl_vehicle_bookings.status', ['approved', 'rejected'])
            ->leftJoin('tbl_offices', 'tbl_offices.office_id', '=', 'tbl_vehicle_bookings.office_id')
            ->leftJoin('tbl_vehicles', 'tbl_vehicles.vehicle_id', '=', 'tbl_vehicle_bookings.vehicle_id')
            ->leftJoin('tbl_drivers', 'tbl_drivers.driver_id', '=', 'tbl_vehicle_bookings.driver_id')
            ->select([
                'tbl_vehicle_bookings.vehicle_booking_id',
                'tbl_vehicle_bookings.purpose',
                'tbl_vehicle_bookings.requested_by',
                'tbl_vehicle_bookings.destination',
                'tbl_vehicle_bookings.status',
                'tbl_vehicle_bookings.approval_remarks',
                'tbl_vehicle_bookings.travel_date',
                'tbl_vehicle_bookings.expected_return_date',
                'tbl_vehicle_bookings.updated_at',
                'tbl_offices.office_name',
                'tbl_vehicles.vehicle_name',
                'tbl_drivers.driver_name',
            ]);

        $this->applyStatus($query, 'tbl_vehicle_bookings.status', $filters);
        $this->applySearch($query, $filters, [
            'tbl_vehicle_bookings.purpose',
            'tbl_vehicle_bookings.requested_by',
            'tbl_vehicle_bookings.destination',
            'tbl_offices.office_name',
            'tbl_vehicles.vehicle_name',
            'tbl_drivers.driver_name',
        ]);

        return $query
            ->orderByDesc('tbl_vehicle_bookings.updated_at')
            ->orderByDesc('tbl_vehicle_bookings.vehicle_booking_id');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyStatus(Builder $query, string $column, array $filters): void
    {
        if (!empty($filters['status'])) {
            $query->where($column, $filters['status']);
        }
    }

    /**
     * @param  array<string, mixed>  $filters
     * @param  list<string>  $columns
     */
    private function applySearch(Builder $query, array $filters, array $columns): void
    {
        $search = trim((string) ($filters['search'] ?? ''));
        if ($search === '') {
            return;
        }

        $query->where(function (Builder $inner) use ($search, $columns) {
            foreach ($columns as $index => $column) {
                $method = $index === 0 ? 'where' : 'orWhere';
                $inner->{$method}($column, 'like', "%{$search}%");
            }
        });
    }

    private function eventRow(object $row): array
    {
        return [
            'id' => (int) $row->event_booking_id,
            'module' => 'event',
            'purpose' => $row->purpose,
            'requested_by' => $row->requested_by,
            'office' => $row->office_name,
            'place' => $row->venue,
            'vehicle' => null,
            'driver' => null,
            'date_start' => $this->dateString($row->date_start),
            'date_end' => $this->dateString($row->date_end),
            'status' => $row->status,
            'remarks' => $row->approval_remarks,
            'updated_at' => $this->dateTimeString($row->updated_at),
        ];
    }

    private function vehicleRow(object $row): array
    {
        return [
            'id' => (int) $row->vehicle_booking_id,
            'module' => 'vehicle',
            'purpose' => $row->purpose,
            'requested_by' => $row->requested_by,
            'office' => $row->office_name,
            'place' => $row->destination,
            'vehicle' => $row->vehicle_name,
            'driver' => $row->driver_name,
            'date_start' => $this->dateString($row->travel_date),
            'date_end' => $this->dateString($row->expected_return_date),
            'status' => $row->status,
            'remarks' => $row->approval_remarks,
            'updated_at' => $this->dateTimeString($row->updated_at),
        ];
    }

    private function dateString(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return $value !== null ? substr((string) $value, 0, 10) : null;
    }

    private function dateTimeString(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i');
        }

        return $value !== null ? (string) $value : null;
    }
}
