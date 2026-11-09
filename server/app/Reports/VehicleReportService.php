<?php

namespace App\Reports;

use App\Models\Driver;
use App\Models\Office;
use App\Models\User;
use App\Models\Vehicle;
use App\Permissions\Permission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class VehicleReportService
{
    public function __construct(private readonly VehicleReportQuery $query)
    {
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function summary(User $user, array $filters): array
    {
        $base = $this->query->bookings($user, $filters);
        $counts = $this->statusCounts($base);

        $completed = (clone $base)
            ->where('tbl_vehicle_bookings.status', 'approved')
            ->whereDate('tbl_vehicle_bookings.expected_return_date', '<', now()->toDateString())
            ->count();

        $upcoming = (clone $base)
            ->where('tbl_vehicle_bookings.status', 'approved')
            ->whereDate('tbl_vehicle_bookings.expected_return_date', '>=', now()->toDateString())
            ->count();

        return [
            'cards' => [
                ['key' => 'total', 'label' => 'Total Vehicle Bookings', 'value' => array_sum($counts)],
                ['key' => 'pending', 'label' => 'Pending Bookings', 'value' => $counts['pending'] ?? 0],
                ['key' => 'approved', 'label' => 'Approved Bookings', 'value' => $counts['approved'] ?? 0],
                ['key' => 'rejected', 'label' => 'Rejected Bookings', 'value' => $counts['rejected'] ?? 0],
                ['key' => 'cancelled', 'label' => 'Cancelled Bookings', 'value' => $counts['cancelled'] ?? 0],
                ['key' => 'completed', 'label' => 'Completed Trips', 'value' => $completed],
                ['key' => 'upcoming', 'label' => 'Upcoming Approved Trips', 'value' => $upcoming],
            ],
            'limited' => $user->isLimited(Permission::REPORTS_VIEW_VEHICLE)
                || $user->isLimited(Permission::REPORTS_VIEW),
            'options' => $this->filterOptions($user),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function trends(User $user, array $filters): array
    {
        $base = $this->query->bookings($user, $filters);
        $counts = $this->statusCounts($base);

        return [
            'daily' => $this->chart('Daily Vehicle Booking Trends', $this->trendSeries($base, 'day')),
            'weekly' => $this->chart('Weekly Vehicle Booking Trends', $this->trendSeries($base, 'week')),
            'monthly' => $this->chart('Monthly Vehicle Booking Trends', $this->trendSeries($base, 'month')),
            'yearly' => $this->chart('Yearly Vehicle Booking Trends', $this->trendSeries($base, 'year')),
            'status_distribution' => $this->chart('Vehicle Booking Status Distribution', $this->statusSeries($counts)),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function utilization(User $user, array $filters): array
    {
        $rows = $this->vehicleTripCounts($user, $filters);
        $ranked = $rows->sortByDesc('value')->values();
        $least = $rows->sortBy('value')->values();
        $canViewFleet = $user->allows(Permission::VEHICLES_VIEW);

        $fleet = [
            'available' => 0,
            'unavailable' => 0,
            'maintenance' => 0,
            'total' => 0,
        ];

        if ($canViewFleet) {
            $fleetCounts = Vehicle::query()
                ->where('is_deleted', false)
                ->selectRaw('status, COUNT(*) as aggregate')
                ->groupBy('status')
                ->pluck('aggregate', 'status')
                ->map(fn ($count) => (int) $count);

            $fleet = [
                'available' => $fleetCounts['available'] ?? 0,
                'unavailable' => $fleetCounts['unavailable'] ?? 0,
                'maintenance' => $fleetCounts['maintenance'] ?? 0,
                'total' => $fleetCounts->sum(),
            ];
        }

        return [
            'can_view_fleet' => $canViewFleet,
            'fleet' => $fleet,
            'most_frequent' => $ranked->take(8)->values()->all(),
            'least_utilized' => $least->take(8)->values()->all(),
            'trips_per_vehicle' => $ranked->all(),
            'frequency' => $this->chart('Vehicle Usage Frequency', $ranked->take(12)->values()->all()),
            'distribution' => $this->chart('Vehicle Booking Distribution', $ranked->take(12)->values()->all()),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function drivers(User $user, array $filters): array
    {
        $canViewDrivers = $user->allows(Permission::DRIVERS_VIEW);
        $assignments = $this->driverTripCounts($user, $filters);
        $assignedIds = $this->query->bookings($user, $filters)
            ->whereNotNull('tbl_vehicle_bookings.driver_id')
            ->whereIn('tbl_vehicle_bookings.status', ['pending', 'approved'])
            ->distinct()
            ->pluck('tbl_vehicle_bookings.driver_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        $cards = [
            ['key' => 'assigned_trips', 'label' => 'Drivers with Assigned Trips', 'value' => $assignedIds->count()],
        ];

        $leave = [];
        $licenses = [];
        $inventory = [
            'total' => 0,
            'available' => 0,
            'on_leave' => 0,
            'unavailable' => 0,
        ];

        if ($canViewDrivers) {
            $statusCounts = Driver::query()
                ->where('is_deleted', false)
                ->selectRaw('driver_status, COUNT(*) as aggregate')
                ->groupBy('driver_status')
                ->pluck('aggregate', 'driver_status')
                ->map(fn ($count) => (int) $count);

            $inventory['available'] = $statusCounts['Available'] ?? 0;
            $inventory['on_leave'] = ($statusCounts['On Leave'] ?? 0) + ($statusCounts['Sick Leave'] ?? 0);
            $inventory['unavailable'] = $statusCounts['Unavailable'] ?? 0;
            $inventory['total'] = $statusCounts->sum();

            $cards = array_merge([
                ['key' => 'total_drivers', 'label' => 'Total Drivers', 'value' => $inventory['total']],
                ['key' => 'available_drivers', 'label' => 'Available Drivers', 'value' => $inventory['available']],
            ], $cards, [
                ['key' => 'on_leave', 'label' => 'Drivers on Leave', 'value' => $inventory['on_leave']],
                ['key' => 'unavailable', 'label' => 'Drivers Unavailable', 'value' => $inventory['unavailable']],
            ]);

            $leave = Driver::query()
                ->where('is_deleted', false)
                ->where('driver_status', '!=', 'Available')
                ->orderBy('driver_name')
                ->get([
                    'driver_id',
                    'driver_name',
                    'driver_status',
                    'status_remarks',
                    'status_start_date',
                    'status_end_date',
                ])
                ->map(fn (Driver $driver) => [
                    'driver_id' => $driver->driver_id,
                    'driver_name' => $driver->driver_name,
                    'status' => $driver->driver_status,
                    'status_remarks' => $driver->status_remarks,
                    'status_start_date' => $this->dateString($driver->status_start_date),
                    'status_end_date' => $this->dateString($driver->status_end_date),
                ])
                ->all();

            $licenses = Driver::query()
                ->where('is_deleted', false)
                ->whereNotNull('license_expiry')
                ->whereDate('license_expiry', '<=', now()->addDays(30)->toDateString())
                ->orderBy('license_expiry')
                ->get(['driver_id', 'driver_name', 'license_expiry'])
                ->map(fn (Driver $driver) => [
                    'driver_id' => $driver->driver_id,
                    'driver_name' => $driver->driver_name,
                    'license_expiry' => $this->dateString($driver->license_expiry),
                    'expired' => $driver->license_expiry?->lt(today()) ?? false,
                ])
                ->all();
        }

        return [
            'can_view_drivers' => $canViewDrivers,
            'cards' => $cards,
            'inventory' => $inventory,
            'assignments' => $assignments->sortByDesc('value')->values()->all(),
            'utilization' => $this->chart(
                'Driver Utilization',
                $assignments->sortByDesc('value')->take(12)->values()->all()
            ),
            'leave' => $leave,
            'licenses' => $licenses,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    public function offices(User $user, array $filters): array
    {
        $rows = $this->query->bookings($user, $filters)
            ->leftJoin('tbl_offices', 'tbl_offices.office_id', '=', 'tbl_vehicle_bookings.office_id')
            ->selectRaw("
                tbl_vehicle_bookings.office_id as office_id,
                COALESCE(tbl_offices.office_name, 'Unassigned') as office_name,
                COUNT(*) as total,
                SUM(CASE WHEN tbl_vehicle_bookings.status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN tbl_vehicle_bookings.status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN tbl_vehicle_bookings.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN tbl_vehicle_bookings.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            ")
            ->groupBy('tbl_vehicle_bookings.office_id', 'tbl_offices.office_name')
            ->orderBy('office_name')
            ->get();

        return $rows->map(fn ($row) => [
            'office_id' => $row->office_id ? (int) $row->office_id : null,
            'office_name' => (string) $row->office_name,
            'total' => (int) $row->total,
            'pending' => (int) $row->pending,
            'approved' => (int) $row->approved,
            'rejected' => (int) $row->rejected,
            'cancelled' => (int) $row->cancelled,
        ])->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function bookings(User $user, array $filters): array
    {
        $sort = $this->query->sortColumn($filters);
        $direction = $this->query->sortDirection($filters);
        $perPage = (int) ($filters['per_page'] ?? 10);

        $paginator = $this->query->bookings($user, $filters)
            ->leftJoin('tbl_offices', 'tbl_offices.office_id', '=', 'tbl_vehicle_bookings.office_id')
            ->leftJoin('tbl_vehicles', 'tbl_vehicles.vehicle_id', '=', 'tbl_vehicle_bookings.vehicle_id')
            ->leftJoin('tbl_drivers', 'tbl_drivers.driver_id', '=', 'tbl_vehicle_bookings.driver_id')
            ->select([
                'tbl_vehicle_bookings.vehicle_booking_id',
                'tbl_vehicle_bookings.requested_by',
                'tbl_vehicle_bookings.destination',
                'tbl_vehicle_bookings.purpose',
                'tbl_vehicle_bookings.travel_date',
                'tbl_vehicle_bookings.departure_time',
                'tbl_vehicle_bookings.expected_return_date',
                'tbl_vehicle_bookings.expected_return_time',
                'tbl_vehicle_bookings.passenger_count',
                'tbl_vehicle_bookings.status',
                'tbl_vehicle_bookings.approval_stage',
                'tbl_offices.office_name',
                'tbl_vehicles.vehicle_name',
                'tbl_vehicles.plate_number',
                'tbl_drivers.driver_name',
            ])
            ->orderBy($sort, $direction)
            ->orderBy('tbl_vehicle_bookings.vehicle_booking_id', 'desc')
            ->paginate($perPage);

        return [
            'data' => collect($paginator->items())->map(fn ($row) => $this->mapBookingRow($row))->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function exportPayload(User $user, array $filters): array
    {
        $summary = $this->summary($user, $filters);
        $utilization = $this->utilization($user, $filters);
        $drivers = $this->drivers($user, $filters);
        $offices = $this->offices($user, $filters);
        $rows = $this->allBookingRows($user, $filters);

        return [
            'module' => 'vehicles',
            'title' => 'FilSched Vehicle Report',
            'organization' => 'Filamer Christian University Inc.',
            'report_type' => 'Vehicle Booking, Utilization, Driver, and Office-Based Reports',
            'generated_at' => now()->format('Y-m-d H:i'),
            'date_range' => ReportExportSupport::dateRangeLabel($filters),
            'filters' => $this->describeFilters($user, $filters),
            'cards' => $summary['cards'],
            'utilization' => $utilization,
            'drivers' => $drivers,
            'offices' => $offices,
            'bookings' => $rows['data'],
            'total_matching' => $rows['total'],
            'exported_count' => count($rows['data']),
            'truncated' => $rows['truncated'],
            'export_limit' => ReportExportSupport::LIMIT,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{data: list<array<string, mixed>>, total: int, truncated: bool}
     */
    public function allBookingRows(User $user, array $filters): array
    {
        $total = $this->query->bookings($user, $filters)->count();
        $sort = $this->query->sortColumn($filters);
        $direction = $this->query->sortDirection($filters);
        $rows = [];

        $this->query->bookings($user, $filters)
            ->leftJoin('tbl_offices', 'tbl_offices.office_id', '=', 'tbl_vehicle_bookings.office_id')
            ->leftJoin('tbl_vehicles', 'tbl_vehicles.vehicle_id', '=', 'tbl_vehicle_bookings.vehicle_id')
            ->leftJoin('tbl_drivers', 'tbl_drivers.driver_id', '=', 'tbl_vehicle_bookings.driver_id')
            ->select([
                'tbl_vehicle_bookings.vehicle_booking_id',
                'tbl_vehicle_bookings.requested_by',
                'tbl_vehicle_bookings.destination',
                'tbl_vehicle_bookings.purpose',
                'tbl_vehicle_bookings.travel_date',
                'tbl_vehicle_bookings.departure_time',
                'tbl_vehicle_bookings.expected_return_date',
                'tbl_vehicle_bookings.expected_return_time',
                'tbl_vehicle_bookings.passenger_count',
                'tbl_vehicle_bookings.status',
                'tbl_vehicle_bookings.approval_stage',
                'tbl_offices.office_name',
                'tbl_vehicles.vehicle_name',
                'tbl_vehicles.plate_number',
                'tbl_drivers.driver_name',
            ])
            ->orderBy($sort, $direction)
            ->orderBy('tbl_vehicle_bookings.vehicle_booking_id', 'desc')
            ->limit(ReportExportSupport::LIMIT)
            ->lazy(250)
            ->each(function ($row) use (&$rows) {
                $rows[] = $this->mapBookingRow($row);
            });

        return [
            'data' => $rows,
            'total' => $total,
            'truncated' => $total > ReportExportSupport::LIMIT,
        ];
    }

    /**
     * @return array<string, int>
     */
    private function statusCounts(Builder $query): array
    {
        return (clone $query)
            ->selectRaw('tbl_vehicle_bookings.status as status, COUNT(*) as aggregate')
            ->groupBy('tbl_vehicle_bookings.status')
            ->pluck('aggregate', 'status')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    /**
     * @param  array<string, int>  $counts
     * @return list<array{label: string, value: int}>
     */
    private function statusSeries(array $counts): array
    {
        $series = [];

        foreach (['pending', 'approved', 'rejected', 'cancelled'] as $status) {
            $series[] = [
                'label' => ucfirst($status),
                'value' => (int) ($counts[$status] ?? 0),
            ];
        }

        return $series;
    }

    /**
     * @return list<array{label: string, value: int}>
     */
    private function trendSeries(Builder $query, string $granularity): array
    {
        $sql = $this->bucketSql('tbl_vehicle_bookings.travel_date', $granularity);

        $rows = (clone $query)
            ->selectRaw("{$sql} as bucket, COUNT(*) as aggregate")
            ->groupBy(DB::raw($sql))
            ->orderBy(DB::raw($sql))
            ->pluck('aggregate', 'bucket')
            ->map(fn ($count) => (int) $count)
            ->all();

        $series = [];

        foreach ($rows as $bucket => $value) {
            if ($bucket === null || $bucket === '') {
                continue;
            }

            $series[] = [
                'label' => (string) $bucket,
                'value' => $value,
            ];
        }

        return $series;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return \Illuminate\Support\Collection<int, array{label: string, value: int}>
     */
    private function vehicleTripCounts(User $user, array $filters)
    {
        $bookingCounts = $this->query->bookings($user, $filters)
            ->leftJoin('tbl_vehicles', 'tbl_vehicles.vehicle_id', '=', 'tbl_vehicle_bookings.vehicle_id')
            ->selectRaw("COALESCE(tbl_vehicles.vehicle_name, 'Unassigned') as label, COUNT(*) as aggregate")
            ->groupBy(DB::raw("COALESCE(tbl_vehicles.vehicle_name, 'Unassigned')"))
            ->pluck('aggregate', 'label')
            ->map(fn ($count) => (int) $count);

        if ($user->allows(Permission::VEHICLES_VIEW) && $this->query->canFilterOffices($user)) {
            Vehicle::query()
                ->where('is_deleted', false)
                ->orderBy('vehicle_name')
                ->get(['vehicle_name'])
                ->each(function (Vehicle $vehicle) use ($bookingCounts) {
                    if (!$bookingCounts->has($vehicle->vehicle_name)) {
                        $bookingCounts[$vehicle->vehicle_name] = 0;
                    }
                });
        }

        return $bookingCounts->map(fn ($value, $label) => [
            'label' => (string) $label,
            'value' => (int) $value,
        ])->values();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return \Illuminate\Support\Collection<int, array{label: string, value: int}>
     */
    private function driverTripCounts(User $user, array $filters)
    {
        return $this->query->bookings($user, $filters)
            ->whereNotNull('tbl_vehicle_bookings.driver_id')
            ->leftJoin('tbl_drivers', 'tbl_drivers.driver_id', '=', 'tbl_vehicle_bookings.driver_id')
            ->selectRaw("COALESCE(tbl_drivers.driver_name, 'Unassigned') as label, COUNT(*) as aggregate")
            ->groupBy(DB::raw("COALESCE(tbl_drivers.driver_name, 'Unassigned')"))
            ->pluck('aggregate', 'label')
            ->map(fn ($count, $label) => [
                'label' => (string) $label,
                'value' => (int) $count,
            ])
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    private function filterOptions(User $user): array
    {
        $canFilterOffices = $this->query->canFilterOffices($user);

        $offices = [];
        if ($canFilterOffices && $user->allows(Permission::OFFICES_VIEW)) {
            $offices = Office::query()
                ->where('is_deleted', false)
                ->orderBy('office_name')
                ->get(['office_id', 'office_code', 'office_name'])
                ->map(fn (Office $office) => [
                    'office_id' => $office->office_id,
                    'office_code' => $office->office_code,
                    'office_name' => $office->office_name,
                ])
                ->all();
        }

        $vehicles = [];
        if ($user->allows(Permission::VEHICLES_VIEW)) {
            $vehicles = Vehicle::query()
                ->where('is_deleted', false)
                ->orderBy('vehicle_name')
                ->get(['vehicle_id', 'vehicle_name', 'plate_number', 'status'])
                ->map(fn (Vehicle $vehicle) => [
                    'vehicle_id' => $vehicle->vehicle_id,
                    'vehicle_name' => $vehicle->vehicle_name,
                    'plate_number' => $vehicle->plate_number,
                    'status' => $vehicle->status,
                ])
                ->all();
        }

        $drivers = [];
        if ($user->allows(Permission::DRIVERS_VIEW)) {
            $drivers = Driver::query()
                ->where('is_deleted', false)
                ->orderBy('driver_name')
                ->get(['driver_id', 'driver_name', 'driver_status'])
                ->map(fn (Driver $driver) => [
                    'driver_id' => $driver->driver_id,
                    'driver_name' => $driver->driver_name,
                    'driver_status' => $driver->driver_status,
                ])
                ->all();
        }

        return [
            'can_filter_offices' => $canFilterOffices,
            'can_filter_vehicles' => $user->allows(Permission::VEHICLES_VIEW),
            'can_filter_drivers' => $user->allows(Permission::DRIVERS_VIEW),
            'locked_office_id' => $canFilterOffices ? null : $user->office_id,
            'offices' => $offices,
            'vehicles' => $vehicles,
            'drivers' => $drivers,
        ];
    }

    private function bucketSql(string $column, string $granularity): string
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return match ($granularity) {
                'week' => "strftime('%Y-%W', {$column})",
                'month' => "strftime('%Y-%m', {$column})",
                'year' => "strftime('%Y', {$column})",
                default => "strftime('%Y-%m-%d', {$column})",
            };
        }

        return match ($granularity) {
            'week' => "DATE_FORMAT({$column}, '%x-%v')",
            'month' => "DATE_FORMAT({$column}, '%Y-%m')",
            'year' => "DATE_FORMAT({$column}, '%Y')",
            default => "DATE_FORMAT({$column}, '%Y-%m-%d')",
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function mapBookingRow(object $row): array
    {
        return [
            'vehicle_booking_id' => (int) $row->vehicle_booking_id,
            'requested_by' => $row->requested_by,
            'office' => $row->office_name,
            'destination' => $row->destination,
            'purpose' => $row->purpose,
            'vehicle' => $row->vehicle_name,
            'plate_number' => $row->plate_number,
            'driver' => $row->driver_name,
            'travel_date' => $this->dateString($row->travel_date),
            'departure_time' => $this->timeString($row->departure_time),
            'expected_return_date' => $this->dateString($row->expected_return_date),
            'expected_return_time' => $this->timeString($row->expected_return_time),
            'passenger_count' => (int) $row->passenger_count,
            'status' => $row->status,
            'approval_stage' => $row->approval_stage,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array{label: string, value: string}>
     */
    private function describeFilters(User $user, array $filters): array
    {
        $officeId = $this->query->authorizedOfficeId($user, $filters['office_id'] ?? null);
        $officeName = 'All offices';
        if ($officeId) {
            $officeName = Office::query()->where('office_id', $officeId)->value('office_name') ?: 'Office #'.$officeId;
        }

        $vehicleId = $filters['vehicle_id'] ?? null;
        $vehicleName = 'All vehicles';
        if ($vehicleId) {
            $vehicle = Vehicle::query()->where('vehicle_id', (int) $vehicleId)->first(['vehicle_name', 'plate_number']);
            $vehicleName = $vehicle
                ? trim($vehicle->vehicle_name.($vehicle->plate_number ? ' ('.$vehicle->plate_number.')' : ''))
                : 'Vehicle #'.$vehicleId;
        }

        $driverId = $filters['driver_id'] ?? null;
        $driverName = 'All drivers';
        if ($driverId) {
            $driverName = Driver::query()->where('driver_id', (int) $driverId)->value('driver_name') ?: 'Driver #'.$driverId;
        }

        $list = $filters['list'] ?? '';

        return [
            ['label' => 'Date range', 'value' => ReportExportSupport::dateRangeLabel($filters)],
            ['label' => 'Status', 'value' => !empty($filters['status']) ? ucfirst((string) $filters['status']) : 'All statuses'],
            ['label' => 'Office', 'value' => $officeName],
            ['label' => 'Vehicle', 'value' => $vehicleName],
            ['label' => 'Driver', 'value' => $driverName],
            ['label' => 'Destination', 'value' => trim((string) ($filters['destination'] ?? '')) !== '' ? (string) $filters['destination'] : 'All destinations'],
            ['label' => 'Search', 'value' => trim((string) ($filters['search'] ?? '')) !== '' ? (string) $filters['search'] : 'None'],
            ['label' => 'List', 'value' => $list === 'upcoming' ? 'Upcoming' : ($list === 'past' ? 'Past' : 'All records')],
        ];
    }

    private function dateString(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return $value !== null ? (string) $value : null;
    }

    private function timeString(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('H:i');
        }

        if (!is_string($value) || $value === '') {
            return $value !== null ? (string) $value : null;
        }

        return substr($value, 0, 5);
    }

    /**
     * @param  list<array{label: string, value: int}>  $series
     * @return array{title: string, series: list<array{label: string, value: int}>}
     */
    private function chart(string $title, array $series): array
    {
        return [
            'title' => $title,
            'series' => $series,
        ];
    }
}
