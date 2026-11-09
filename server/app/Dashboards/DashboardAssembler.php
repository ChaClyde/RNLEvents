<?php

namespace App\Dashboards;

use App\Models\Driver;
use App\Models\EventBooking;
use App\Models\EventBookingApproval;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Models\VehicleBookingApproval;
use App\Models\Venue;
use App\Permissions\Permission;
use App\Permissions\PermissionCatalog;
use App\Permissions\PermissionChecker;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class DashboardAssembler
{

    public const PERIODS = ['7d', '30d', '6m', '12m'];

    public function assemble(User $user, string $period = '30d'): array
    {
        $user->loadMissing(['role', 'office']);

        $period = in_array($period, self::PERIODS, true) ? $period : '30d';
        [$from, $to, $granularity] = $this->periodWindow($period);
        $slug = $user->role?->slug ?? '';

        $payload = match ($slug) {
            Role::SUPER_ADMIN => $this->superAdmin($user, $from, $to, $granularity),
            Role::EVENT_ADMIN => $this->eventAdmin($user, $from, $to, $granularity),
            Role::VEHICLE_ADMIN => $this->vehicleAdmin($user, $from, $to, $granularity),
            Role::EVENT_APPROVAL_ADMIN => $this->eventApprovalAdmin($user, $from, $to),
            Role::VEHICLE_APPROVAL_ADMIN => $this->vehicleApprovalAdmin($user, $from, $to),
            Role::DEAN_OFFICE_HEAD => $this->dean($user, $from, $to, $granularity),
            Role::FACULTY_STAFF => $this->faculty($user, $from, $to),
            Role::STUDENT_REPUBLIC => $this->student($user, $from, $to),
            default => $this->emptyDashboard($user),
        };

        return array_merge([
            'role' => $slug,
            'role_label' => $this->roleLabel($slug),
            'period' => $period,
            'period_label' => $this->periodLabel($period),
            'user' => [
                'full_name' => $user->full_name,
                'office' => $user->office?->office_name,
            ],
        ], $payload);
    }

    /**
     * @return array{0: Carbon, 1: Carbon, 2: string}
     */
    private function periodWindow(string $period): array
    {
        $to = now()->endOfDay();

        return match ($period) {
            '7d' => [now()->subDays(6)->startOfDay(), $to, 'day'],
            '6m' => [now()->subMonthsNoOverflow(5)->startOfMonth(), $to, 'month'],
            '12m' => [now()->subMonthsNoOverflow(11)->startOfMonth(), $to, 'month'],
            default => [now()->subDays(29)->startOfDay(), $to, 'day'],
        };
    }

    private function superAdmin(User $user, Carbon $from, Carbon $to, string $granularity): array
    {
        $eventCounts = $this->statusCounts($this->eventBookings($user));
        $vehicleCounts = $this->statusCounts($this->vehicleBookings($user));

        $pendingFinalEvents = $this->pendingAtStages(
            $this->eventBookings($user),
            $this->approveStages($user, Permission::EVENT_APPROVALS_APPROVE),
        );
        $pendingFinalVehicles = $this->pendingAtStages(
            $this->vehicleBookings($user),
            $this->approveStages($user, Permission::VEHICLE_APPROVALS_APPROVE),
        );

        return [
            'capabilities' => [
                'events' => true,
                'vehicles' => true,
                'users' => true,
                'venues' => true,
                'drivers' => true,
            ],
            'cards' => [
                $this->card('total_users', 'Total Users', $this->userCount($user)),
                $this->card('active_users', 'Active Users', $this->userCount($user, true)),
                $this->card('total_offices', 'Total Offices', Office::query()->where('is_deleted', false)->count()),
                $this->card('total_event_bookings', 'Total Event Bookings', array_sum($eventCounts)),
                $this->card('total_vehicle_bookings', 'Total Vehicle Bookings', array_sum($vehicleCounts)),
                $this->card(
                    'pending_approvals',
                    'Pending Approvals',
                    ($eventCounts['pending'] ?? 0) + ($vehicleCounts['pending'] ?? 0),
                ),
                $this->card(
                    'approved_bookings',
                    'Approved Bookings',
                    ($eventCounts['approved'] ?? 0) + ($vehicleCounts['approved'] ?? 0),
                ),
                $this->card(
                    'rejected_bookings',
                    'Rejected Bookings',
                    ($eventCounts['rejected'] ?? 0) + ($vehicleCounts['rejected'] ?? 0),
                ),
            ],
            'charts' => [
                'event_trends' => $this->chart(
                    'Event Booking Trends',
                    $this->bookingTrend($this->eventBookings($user), $from, $to, $granularity),
                ),
                'vehicle_trends' => $this->chart(
                    'Vehicle Booking Trends',
                    $this->bookingTrend($this->vehicleBookings($user), $from, $to, $granularity),
                ),
                'status_distribution' => $this->chart(
                    'Booking Status Distribution',
                    $this->combinedStatusSeries($eventCounts, $vehicleCounts),
                ),
                'monthly_activity' => $this->chart(
                    'Monthly Booking Activity',
                    $this->combinedMonthlyActivity($user, $from, $to, $granularity),
                ),
                'venue_utilization' => $this->chart(
                    'Venue Utilization',
                    $this->venueUtilization($user, $from, $to),
                ),
                'vehicle_utilization' => $this->chart(
                    'Vehicle Utilization',
                    $this->vehicleUtilization($user, $from, $to),
                ),
            ],
            'sections' => [
                'recent_activities' => $this->section(
                    'Recent System Activities',
                    $this->systemActivities($user),
                ),
                'recent_event_bookings' => $this->section(
                    'Recent Event Bookings',
                    $this->recentEvents($user),
                ),
                'recent_vehicle_bookings' => $this->section(
                    'Recent Vehicle Bookings',
                    $this->recentVehicles($user),
                ),
                'pending_approvals' => $this->section(
                    'Pending Final Approvals',
                    array_merge(
                        $this->mapEvents($this->takeEvents($pendingFinalEvents)),
                        $this->mapVehicles($this->takeVehicles($pendingFinalVehicles)),
                    ),
                ),
            ],
        ];
    }

    private function eventAdmin(User $user, Carbon $from, Carbon $to, string $granularity): array
    {
        $counts = $this->statusCounts($this->eventBookings($user));
        $stages = $this->approveStages($user, Permission::EVENT_APPROVALS_APPROVE);
        $pendingReview = $this->pendingAtStages($this->eventBookings($user), $stages);

        return [
            'capabilities' => [
                'events' => true,
                'vehicles' => false,
                'users' => false,
                'venues' => true,
                'drivers' => false,
            ],
            'cards' => [
                $this->card('total_event_bookings', 'Total Event Bookings', array_sum($counts)),
                $this->card('pending_event_admin', 'Pending Event Admin Approvals', (clone $pendingReview)->count()),
                $this->card('approved_events', 'Approved Events', $counts['approved'] ?? 0),
                $this->card('rejected_events', 'Rejected Events', $counts['rejected'] ?? 0),
                $this->card('total_venues', 'Total Venues', Venue::query()->where('is_deleted', false)->count()),
                $this->card(
                    'available_venues',
                    'Available Venues',
                    Venue::query()->where('is_deleted', false)->where('status', 'available')->count(),
                ),
            ],
            'charts' => [
                'event_trends' => $this->chart(
                    'Monthly Event Bookings',
                    $this->bookingTrend($this->eventBookings($user), $from, $to, $granularity),
                ),
                'status_distribution' => $this->chart(
                    'Event Booking Status Distribution',
                    $this->statusSeries($counts),
                ),
                'venue_utilization' => $this->chart(
                    'Venue Utilization',
                    $this->venueUtilization($user, $from, $to),
                ),
            ],
            'sections' => [
                'pending_approvals' => $this->section(
                    'Events Awaiting Event Admin Review',
                    $this->mapEvents($this->takeEvents($pendingReview)),
                ),
                'upcoming_events' => $this->section(
                    'Upcoming Approved Events',
                    $this->upcomingEvents($user),
                ),
                'recent_activities' => $this->section(
                    'Recent Event Activities',
                    $this->eventActivities($user),
                ),
            ],
        ];
    }

    private function vehicleAdmin(User $user, Carbon $from, Carbon $to, string $granularity): array
    {
        $counts = $this->statusCounts($this->vehicleBookings($user));
        $stages = $this->approveStages($user, Permission::VEHICLE_APPROVALS_APPROVE);
        $awaiting = $this->pendingAtStages($this->vehicleBookings($user), $stages);

        return [
            'capabilities' => [
                'events' => false,
                'vehicles' => true,
                'users' => false,
                'venues' => false,
                'drivers' => true,
            ],
            'cards' => [
                $this->card('total_vehicle_bookings', 'Total Vehicle Bookings', array_sum($counts)),
                $this->card('pending_vehicle_admin', 'Pending Vehicle Admin Approvals', (clone $awaiting)->count()),
                $this->card('approved_trips', 'Approved Trips', $counts['approved'] ?? 0),
                $this->card('total_vehicles', 'Total Vehicles', Vehicle::query()->where('is_deleted', false)->count()),
                $this->card(
                    'available_vehicles',
                    'Available Vehicles',
                    Vehicle::query()->where('is_deleted', false)->where('status', 'available')->count(),
                ),
                $this->card(
                    'vehicles_maintenance',
                    'Vehicles Under Maintenance',
                    Vehicle::query()->where('is_deleted', false)->where('status', 'maintenance')->count(),
                ),
                $this->card('total_drivers', 'Total Drivers', Driver::query()->where('is_deleted', false)->count()),
                $this->card(
                    'available_drivers',
                    'Available Drivers',
                    Driver::query()->where('is_deleted', false)->where('driver_status', 'Available')->count(),
                ),
            ],
            'charts' => [
                'vehicle_trends' => $this->chart(
                    'Monthly Vehicle Booking Trends',
                    $this->bookingTrend($this->vehicleBookings($user), $from, $to, $granularity),
                ),
                'status_distribution' => $this->chart(
                    'Vehicle Booking Status Distribution',
                    $this->statusSeries($counts),
                ),
                'vehicle_utilization' => $this->chart(
                    'Vehicle Utilization',
                    $this->vehicleUtilization($user, $from, $to),
                ),
            ],
            'sections' => [
                'pending_approvals' => $this->section(
                    'Vehicle Bookings Awaiting Assignment or Review',
                    $this->mapVehicles($this->takeVehicles($awaiting)),
                ),
                'upcoming_trips' => $this->section(
                    'Upcoming Trips',
                    $this->upcomingTrips($user),
                ),
                'driver_availability' => $this->section('Driver Availability', $this->driverOverview()),
                'vehicle_maintenance' => $this->section('Vehicle Maintenance Overview', $this->maintenanceOverview()),
            ],
        ];
    }

    private function eventApprovalAdmin(User $user, Carbon $from, Carbon $to): array
    {
        $stages = $this->approveStages($user, Permission::EVENT_APPROVALS_APPROVE);
        $pending = $this->pendingAtStages($this->eventBookings($user), $stages);
        $reviews = $this->reviewCounts(EventBookingApproval::class, $user);

        return [
            'capabilities' => [
                'events' => true,
                'vehicles' => false,
                'users' => false,
                'venues' => false,
                'drivers' => false,
            ],
            'cards' => [
                $this->card('pending_event_approvals', 'Pending Event Approvals', (clone $pending)->count()),
                $this->card('approved_event_reviews', 'Approved Event Reviews', $reviews['approved']),
                $this->card('rejected_event_reviews', 'Rejected Event Reviews', $reviews['rejected']),
                $this->card('total_events_reviewed', 'Total Events Reviewed', $reviews['total']),
            ],
            'charts' => [],
            'sections' => [
                'pending_approvals' => $this->section(
                    'Events Awaiting My Approval',
                    $this->mapEvents($this->takeEvents($pending)),
                ),
                'recent_reviews' => $this->section(
                    'Recently Reviewed Events',
                    $this->recentEventReviews($user),
                ),
                'upcoming_events' => $this->section(
                    'Upcoming Events',
                    $this->upcomingEvents($user),
                ),
            ],
        ];
    }

    private function vehicleApprovalAdmin(User $user, Carbon $from, Carbon $to): array
    {
        $stages = $this->approveStages($user, Permission::VEHICLE_APPROVALS_APPROVE);
        $pending = $this->pendingAtStages($this->vehicleBookings($user), $stages);
        $reviews = $this->reviewCounts(VehicleBookingApproval::class, $user);

        return [
            'capabilities' => [
                'events' => false,
                'vehicles' => true,
                'users' => false,
                'venues' => false,
                'drivers' => false,
            ],
            'cards' => [
                $this->card('pending_vehicle_approvals', 'Pending Vehicle Approvals', (clone $pending)->count()),
                $this->card('approved_vehicle_reviews', 'Approved Vehicle Reviews', $reviews['approved']),
                $this->card('rejected_vehicle_reviews', 'Rejected Vehicle Reviews', $reviews['rejected']),
                $this->card('total_vehicle_reviews', 'Total Vehicle Requests Reviewed', $reviews['total']),
            ],
            'charts' => [],
            'sections' => [
                'pending_approvals' => $this->section(
                    'Vehicle Requests Awaiting My Approval',
                    $this->mapVehicles($this->takeVehicles($pending)),
                ),
                'recent_reviews' => $this->section(
                    'Recently Reviewed Vehicle Requests',
                    $this->recentVehicleReviews($user),
                ),
                'upcoming_trips' => $this->section(
                    'Upcoming Trips',
                    $this->upcomingTrips($user),
                ),
            ],
        ];
    }

    private function dean(User $user, Carbon $from, Carbon $to, string $granularity): array
    {
        $eventCounts = $this->statusCounts($this->eventBookings($user));
        $vehicleCounts = $this->statusCounts($this->vehicleBookings($user));
        $eventStages = $this->approveStages($user, Permission::EVENT_APPROVALS_APPROVE);
        $vehicleStages = $this->approveStages($user, Permission::VEHICLE_APPROVALS_APPROVE);

        $pendingEvents = $this->pendingAtStages($this->eventBookings($user), $eventStages);
        $pendingVehicles = $this->pendingAtStages($this->vehicleBookings($user), $vehicleStages);

        return [
            'capabilities' => [
                'events' => true,
                'vehicles' => true,
                'users' => true,
                'venues' => false,
                'drivers' => false,
            ],
            'cards' => [
                $this->card('office_users', 'Total Office Users', $this->userCount($user)),
                $this->card('office_event_bookings', 'Total Office Event Bookings', array_sum($eventCounts)),
                $this->card('office_vehicle_bookings', 'Total Office Vehicle Bookings', array_sum($vehicleCounts)),
                $this->card(
                    'pending_office_approvals',
                    'Pending Office Approvals',
                    (clone $pendingEvents)->count() + (clone $pendingVehicles)->count(),
                ),
                $this->card(
                    'approved_office_bookings',
                    'Approved Office Bookings',
                    ($eventCounts['approved'] ?? 0) + ($vehicleCounts['approved'] ?? 0),
                ),
                $this->card(
                    'rejected_office_bookings',
                    'Rejected Office Bookings',
                    ($eventCounts['rejected'] ?? 0) + ($vehicleCounts['rejected'] ?? 0),
                ),
            ],
            'charts' => [
                'event_trends' => $this->chart(
                    'Office Event Booking Trends',
                    $this->bookingTrend($this->eventBookings($user), $from, $to, $granularity),
                ),
                'vehicle_trends' => $this->chart(
                    'Office Vehicle Booking Trends',
                    $this->bookingTrend($this->vehicleBookings($user), $from, $to, $granularity),
                ),
                'status_distribution' => $this->chart(
                    'Office Booking Status Distribution',
                    $this->combinedStatusSeries($eventCounts, $vehicleCounts),
                ),
            ],
            'sections' => [
                'pending_approvals' => $this->section(
                    'Pending Office Approvals',
                    array_merge(
                        $this->mapEvents($this->takeEvents($pendingEvents)),
                        $this->mapVehicles($this->takeVehicles($pendingVehicles)),
                    ),
                ),
                'upcoming_events' => $this->section('Upcoming Office Events', $this->upcomingEvents($user)),
                'upcoming_trips' => $this->section('Upcoming Office Trips', $this->upcomingTrips($user)),
                'recent_activities' => $this->section('Recent Office Activities', $this->officeActivities($user)),
            ],
        ];
    }

    private function faculty(User $user, Carbon $from, Carbon $to): array
    {
        $eventCounts = $this->statusCounts($this->eventBookings($user));
        $vehicleCounts = $this->statusCounts($this->vehicleBookings($user));

        return [
            'capabilities' => [
                'events' => true,
                'vehicles' => true,
                'users' => false,
                'venues' => false,
                'drivers' => false,
            ],
            'cards' => [
                $this->card('my_event_requests', 'My Event Requests', array_sum($eventCounts)),
                $this->card('my_vehicle_requests', 'My Vehicle Requests', array_sum($vehicleCounts)),
                $this->card(
                    'pending_requests',
                    'Pending Requests',
                    ($eventCounts['pending'] ?? 0) + ($vehicleCounts['pending'] ?? 0),
                ),
                $this->card(
                    'approved_requests',
                    'Approved Requests',
                    ($eventCounts['approved'] ?? 0) + ($vehicleCounts['approved'] ?? 0),
                ),
                $this->card(
                    'rejected_requests',
                    'Rejected Requests',
                    ($eventCounts['rejected'] ?? 0) + ($vehicleCounts['rejected'] ?? 0),
                ),
            ],
            'charts' => [],
            'sections' => [
                'upcoming_events' => $this->section('My Upcoming Events', $this->upcomingEvents($user)),
                'upcoming_trips' => $this->section('My Upcoming Trips', $this->upcomingTrips($user)),
                'recent_activities' => $this->section('Recent Booking Activities', $this->ownActivities($user)),
            ],
        ];
    }

    private function student(User $user, Carbon $from, Carbon $to): array
    {
        $eventCounts = $this->statusCounts($this->eventBookings($user));

        return [
            'capabilities' => [
                'events' => true,
                'vehicles' => false,
                'users' => false,
                'venues' => false,
                'drivers' => false,
            ],
            'cards' => [
                $this->card('my_event_requests', 'My Event Requests', array_sum($eventCounts)),
                $this->card('pending_requests', 'Pending Requests', $eventCounts['pending'] ?? 0),
                $this->card('approved_events', 'Approved Events', $eventCounts['approved'] ?? 0),
                $this->card('rejected_requests', 'Rejected Requests', $eventCounts['rejected'] ?? 0),
            ],
            'charts' => [],
            'sections' => [
                'upcoming_events' => $this->section('My Upcoming Events', $this->upcomingEvents($user)),
                'recent_activities' => $this->section(
                    'Recent Event Booking Activities',
                    $this->eventActivities($user),
                ),
            ],
        ];
    }

    private function emptyDashboard(User $user): array
    {
        return [
            'capabilities' => [
                'events' => false,
                'vehicles' => false,
                'users' => false,
                'venues' => false,
                'drivers' => false,
            ],
            'cards' => [],
            'charts' => [],
            'sections' => [],
        ];
    }

    private function constrainBookings(Builder $query, User $user, string $table, string ...$abilities): Builder
    {
        $checker = app(PermissionChecker::class);

        foreach ($abilities as $ability) {
            if ($user->allows($ability)) {
                return $checker->constrainQuery($query, $user, $ability, [
                    'office_id' => $table.'.office_id',
                    'owner_id' => $table.'.requested_by_user_id',
                ]);
            }
        }

        return $query->whereRaw('1 = 0');
    }

    private function eventBookings(User $user): Builder
    {
        $query = EventBooking::query()->where('tbl_event_bookings.is_deleted', false);

        return $this->constrainBookings(
            $query,
            $user,
            'tbl_event_bookings',
            Permission::EVENT_BOOKINGS_VIEW,
            Permission::EVENT_APPROVALS_VIEW,
        );
    }

    private function vehicleBookings(User $user): Builder
    {
        $query = VehicleBooking::query()->where('tbl_vehicle_bookings.is_deleted', false);

        return $this->constrainBookings(
            $query,
            $user,
            'tbl_vehicle_bookings',
            Permission::VEHICLE_BOOKINGS_VIEW,
            Permission::VEHICLE_APPROVALS_VIEW,
        );
    }

    /**
     * @return array<string, int>
     */
    private function statusCounts(Builder $query): array
    {
        $table = $query->getModel()->getTable();

        return (clone $query)
            ->selectRaw($table.'.status as status, COUNT(*) as aggregate')
            ->groupBy($table.'.status')
            ->pluck('aggregate', 'status')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    /**
     * @param  list<string>  $stages
     */
    private function pendingAtStages(Builder $query, array $stages): Builder
    {
        $table = $query->getModel()->getTable();
        $pending = (clone $query)->where($table.'.status', 'pending');

        if ($stages === []) {
            return $pending->whereRaw('1 = 0');
        }

        return $pending->whereIn($table.'.approval_stage', $stages);
    }

    /**
     * @return list<string>
     */
    private function approveStages(User $user, string $ability): array
    {
        if (!$user->allows($ability)) {
            return [];
        }

        return PermissionCatalog::ruleFor($user->role?->slug, $ability)?->approvalStages ?? [];
    }

    /**
     * @return list<array{label: string, value: int}>
     */
    private function bookingTrend(Builder $query, Carbon $from, Carbon $to, string $granularity): array
    {
        $column = $query->getModel()->getTable().'.created_at';
        $sql = $this->bucketSql($column, $granularity);

        $rows = (clone $query)
            ->whereBetween($column, [$from, $to])
            ->selectRaw("{$sql} as bucket, COUNT(*) as aggregate")
            ->groupBy(DB::raw($sql))
            ->pluck('aggregate', 'bucket')
            ->map(fn ($count) => (int) $count)
            ->all();

        return $this->fillBuckets($from, $to, $granularity, $rows);
    }

    /**
     * @param  array<string, int>  $eventCounts
     * @param  array<string, int>  $vehicleCounts
     * @return list<array{label: string, value: int}>
     */
    private function combinedStatusSeries(array $eventCounts, array $vehicleCounts): array
    {
        $combined = [];

        foreach (['pending', 'approved', 'rejected', 'cancelled'] as $status) {
            $combined[$status] = ($eventCounts[$status] ?? 0) + ($vehicleCounts[$status] ?? 0);
        }

        return $this->statusSeries($combined);
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
     * @return list<array{label: string, value: int, secondary?: int}>
     */
    private function combinedMonthlyActivity(User $user, Carbon $from, Carbon $to, string $granularity): array
    {
        $events = collect($this->bookingTrend($this->eventBookings($user), $from, $to, $granularity))
            ->keyBy('label');
        $vehicles = collect($this->bookingTrend($this->vehicleBookings($user), $from, $to, $granularity))
            ->keyBy('label');

        return $events->map(function (array $point, string $label) use ($vehicles) {
            return [
                'label' => $label,
                'value' => $point['value'],
                'secondary' => $vehicles[$label]['value'] ?? 0,
            ];
        })->values()->all();
    }

    /**
     * @return list<array{label: string, value: int}>
     */
    private function venueUtilization(User $user, Carbon $from, Carbon $to): array
    {
        $rows = $this->eventBookings($user)
            ->where('tbl_event_bookings.status', 'approved')
            ->whereDate('date_start', '<=', $to->toDateString())
            ->whereDate('date_end', '>=', $from->toDateString())
            ->leftJoin('tbl_venues', 'tbl_venues.venue_id', '=', 'tbl_event_bookings.venue_id')
            ->selectRaw("COALESCE(tbl_venues.venue, 'Unassigned') as label, COUNT(*) as aggregate")
            ->groupBy(DB::raw("COALESCE(tbl_venues.venue, 'Unassigned')"))
            ->orderByDesc('aggregate')
            ->limit(8)
            ->get();

        return $rows->map(fn ($row) => [
            'label' => (string) $row->label,
            'value' => (int) $row->aggregate,
        ])->all();
    }

    /**
     * @return list<array{label: string, value: int}>
     */
    private function vehicleUtilization(User $user, Carbon $from, Carbon $to): array
    {
        $rows = $this->vehicleBookings($user)
            ->where('tbl_vehicle_bookings.status', 'approved')
            ->whereDate('travel_date', '<=', $to->toDateString())
            ->whereDate('expected_return_date', '>=', $from->toDateString())
            ->leftJoin('tbl_vehicles', 'tbl_vehicles.vehicle_id', '=', 'tbl_vehicle_bookings.vehicle_id')
            ->selectRaw("COALESCE(tbl_vehicles.vehicle_name, 'Unassigned') as label, COUNT(*) as aggregate")
            ->groupBy(DB::raw("COALESCE(tbl_vehicles.vehicle_name, 'Unassigned')"))
            ->orderByDesc('aggregate')
            ->limit(8)
            ->get();

        return $rows->map(fn ($row) => [
            'label' => (string) $row->label,
            'value' => (int) $row->aggregate,
        ])->all();
    }

    private function userCount(User $user, bool $activeOnly = false): int
    {
        if (!$user->allows(Permission::USERS_VIEW)) {
            return 0;
        }

        $query = User::query()->where('tbl_users.is_deleted', false);

        if ($activeOnly) {
            $query->where('account_status', 'Active');
        }

        return app(PermissionChecker::class)
            ->constrainQuery($query, $user, Permission::USERS_VIEW, ['owner_id' => 'user_id'])
            ->count();
    }

    private function takeEvents(Builder $query, int $limit = 8)
    {
        return $query
            ->with(['venue:venue_id,venue', 'office:office_id,office_name'])
            ->latest('tbl_event_bookings.updated_at')
            ->limit($limit)
            ->get();
    }

    private function takeVehicles(Builder $query, int $limit = 8)
    {
        return $query
            ->with([
                'vehicle:vehicle_id,vehicle_name,plate_number',
                'office:office_id,office_name',
            ])
            ->latest('tbl_vehicle_bookings.updated_at')
            ->limit($limit)
            ->get();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentEvents(User $user): array
    {
        return $this->mapEvents(
            $this->eventBookings($user)
                ->with(['venue:venue_id,venue', 'office:office_id,office_name'])
                ->latest('tbl_event_bookings.updated_at')
                ->limit(8)
                ->get()
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentVehicles(User $user): array
    {
        return $this->mapVehicles(
            $this->vehicleBookings($user)
                ->with([
                    'vehicle:vehicle_id,vehicle_name,plate_number',
                    'office:office_id,office_name',
                ])
                ->latest('tbl_vehicle_bookings.updated_at')
                ->limit(8)
                ->get()
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function upcomingEvents(User $user): array
    {
        return $this->mapEvents(
            $this->eventBookings($user)
                ->with(['venue:venue_id,venue', 'office:office_id,office_name'])
                ->where('status', 'approved')
                ->whereDate('date_end', '>=', now()->toDateString())
                ->orderBy('date_start')
                ->limit(8)
                ->get()
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function upcomingTrips(User $user): array
    {
        return $this->mapVehicles(
            $this->vehicleBookings($user)
                ->with([
                    'vehicle:vehicle_id,vehicle_name,plate_number',
                    'office:office_id,office_name',
                ])
                ->where('status', 'approved')
                ->whereDate('expected_return_date', '>=', now()->toDateString())
                ->orderBy('travel_date')
                ->limit(8)
                ->get()
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function systemActivities(User $user): array
    {
        return $this->mergeActivities(
            $this->eventActivities($user),
            $this->vehicleActivities($user),
            $this->recentEventReviews($user, false),
            $this->recentVehicleReviews($user, false),
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function officeActivities(User $user): array
    {
        return $this->mergeActivities(
            $this->eventActivities($user),
            $this->vehicleActivities($user),
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function ownActivities(User $user): array
    {
        return $this->mergeActivities(
            $this->eventActivities($user),
            $this->vehicleActivities($user),
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function eventActivities(User $user): array
    {
        return $this->eventBookings($user)
            ->latest('tbl_event_bookings.updated_at')
            ->limit(8)
            ->get(['event_booking_id', 'purpose', 'status', 'approval_stage', 'updated_at'])
            ->map(fn (EventBooking $booking) => [
                'id' => 'event-'.$booking->event_booking_id,
                'type' => 'event_booking',
                'title' => $booking->purpose,
                'detail' => 'Event booking marked '.$booking->status,
                'status' => $booking->status,
                'occurred_at' => optional($booking->updated_at)?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function vehicleActivities(User $user): array
    {
        if (
            !$user->allows(Permission::VEHICLE_BOOKINGS_VIEW)
            && !$user->allows(Permission::VEHICLE_APPROVALS_VIEW)
        ) {
            return [];
        }

        return $this->vehicleBookings($user)
            ->latest('tbl_vehicle_bookings.updated_at')
            ->limit(8)
            ->get(['vehicle_booking_id', 'purpose', 'destination', 'status', 'updated_at'])
            ->map(fn (VehicleBooking $booking) => [
                'id' => 'vehicle-'.$booking->vehicle_booking_id,
                'type' => 'vehicle_booking',
                'title' => $booking->purpose,
                'detail' => 'Vehicle trip to '.$booking->destination.' marked '.$booking->status,
                'status' => $booking->status,
                'occurred_at' => optional($booking->updated_at)?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentEventReviews(User $user, bool $asSection = true): array
    {
        $rows = EventBookingApproval::query()
            ->with(['booking:event_booking_id,purpose,status,is_deleted'])
            ->where('approver_user_id', $user->user_id)
            ->latest('event_booking_approval_id')
            ->limit(8)
            ->get()
            ->filter(fn (EventBookingApproval $row) => $row->booking && !$row->booking->is_deleted);

        if (!$asSection) {
            return $rows->map(fn (EventBookingApproval $row) => [
                'id' => 'event-review-'.$row->event_booking_approval_id,
                'type' => 'event_review',
                'title' => $row->booking?->purpose,
                'detail' => 'Event '.$row->action.' at '.$row->approval_stage,
                'status' => $row->action,
                'occurred_at' => optional($row->created_at)?->toIso8601String(),
            ])->values()->all();
        }

        return $rows->map(fn (EventBookingApproval $row) => [
            'id' => $row->booking?->event_booking_id,
            'type' => 'event_booking',
            'title' => $row->booking?->purpose,
            'status' => $row->action,
            'approval_stage' => $row->approval_stage,
            'detail' => $row->action.' at '.$row->approval_stage,
            'occurred_at' => optional($row->created_at)?->toIso8601String(),
        ])->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentVehicleReviews(User $user, bool $asSection = true): array
    {
        $rows = VehicleBookingApproval::query()
            ->with(['booking:vehicle_booking_id,purpose,destination,status,is_deleted'])
            ->where('approver_user_id', $user->user_id)
            ->latest('vehicle_booking_approval_id')
            ->limit(8)
            ->get()
            ->filter(fn (VehicleBookingApproval $row) => $row->booking && !$row->booking->is_deleted);

        if (!$asSection) {
            return $rows->map(fn (VehicleBookingApproval $row) => [
                'id' => 'vehicle-review-'.$row->vehicle_booking_approval_id,
                'type' => 'vehicle_review',
                'title' => $row->booking?->purpose,
                'detail' => 'Vehicle request '.$row->action.' at '.$row->approval_stage,
                'status' => $row->action,
                'occurred_at' => optional($row->created_at)?->toIso8601String(),
            ])->values()->all();
        }

        return $rows->map(fn (VehicleBookingApproval $row) => [
            'id' => $row->booking?->vehicle_booking_id,
            'type' => 'vehicle_booking',
            'title' => $row->booking?->purpose,
            'status' => $row->action,
            'approval_stage' => $row->approval_stage,
            'detail' => $row->action.' at '.$row->approval_stage,
            'occurred_at' => optional($row->created_at)?->toIso8601String(),
        ])->values()->all();
    }

    /**
     * @return array{approved: int, rejected: int, total: int}
     */
    private function reviewCounts(string $model, User $user): array
    {
        $counts = $model::query()
            ->where('approver_user_id', $user->user_id)
            ->selectRaw('action, COUNT(*) as aggregate')
            ->groupBy('action')
            ->pluck('aggregate', 'action');

        $approved = (int) ($counts[EventBookingApproval::ACTION_APPROVED] ?? 0);
        $rejected = (int) ($counts[EventBookingApproval::ACTION_REJECTED] ?? 0);

        return [
            'approved' => $approved,
            'rejected' => $rejected,
            'total' => $approved + $rejected,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function driverOverview(): array
    {
        return Driver::query()
            ->where('is_deleted', false)
            ->orderBy('driver_name')
            ->limit(8)
            ->get(['driver_id', 'driver_name', 'driver_status', 'license_expiry'])
            ->map(fn (Driver $driver) => [
                'id' => $driver->driver_id,
                'type' => 'driver',
                'title' => $driver->driver_name,
                'status' => $driver->driver_status,
                'detail' => $driver->license_expiry
                    ? 'License expires '.$driver->license_expiry->toDateString()
                    : 'No license expiry on file',
            ])
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function maintenanceOverview(): array
    {
        return Vehicle::query()
            ->where('is_deleted', false)
            ->where('status', 'maintenance')
            ->orderBy('vehicle_name')
            ->limit(8)
            ->get(['vehicle_id', 'vehicle_name', 'plate_number', 'status'])
            ->map(fn (Vehicle $vehicle) => [
                'id' => $vehicle->vehicle_id,
                'type' => 'vehicle',
                'title' => $vehicle->vehicle_name,
                'status' => $vehicle->status,
                'detail' => $vehicle->plate_number,
            ])
            ->all();
    }

    /**
     * @param  iterable<int, EventBooking>  $bookings
     * @return list<array<string, mixed>>
     */
    private function mapEvents($bookings): array
    {
        $items = [];

        foreach ($bookings as $booking) {
            $items[] = [
                'id' => $booking->event_booking_id,
                'type' => 'event_booking',
                'title' => $booking->purpose,
                'status' => $booking->status,
                'approval_stage' => $booking->approval_stage,
                'detail' => trim(implode(' · ', array_filter([
                    $booking->venue?->venue,
                    $booking->office?->office_name,
                    $booking->requested_by,
                ]))),
                'start' => optional($booking->date_start)?->toDateString(),
                'end' => optional($booking->date_end)?->toDateString(),
            ];
        }

        return $items;
    }

    /**
     * @param  iterable<int, VehicleBooking>  $bookings
     * @return list<array<string, mixed>>
     */
    private function mapVehicles($bookings): array
    {
        $items = [];

        foreach ($bookings as $booking) {
            $items[] = [
                'id' => $booking->vehicle_booking_id,
                'type' => 'vehicle_booking',
                'title' => $booking->purpose,
                'status' => $booking->status,
                'approval_stage' => $booking->approval_stage,
                'detail' => trim(implode(' · ', array_filter([
                    $booking->destination,
                    $booking->vehicle?->vehicle_name,
                    $booking->office?->office_name,
                    $booking->requested_by,
                ]))),
                'start' => optional($booking->travel_date)?->toDateString(),
                'end' => optional($booking->expected_return_date)?->toDateString(),
            ];
        }

        return $items;
    }

    /**
     * @param  list<array<string, mixed>>  ...$groups
     * @return list<array<string, mixed>>
     */
    private function mergeActivities(array ...$groups): array
    {
        return collect($groups)
            ->flatten(1)
            ->sortByDesc('occurred_at')
            ->take(8)
            ->values()
            ->all();
    }

    /**
     * @param  array<string, int>  $rows
     * @return list<array{label: string, value: int}>
     */
    private function fillBuckets(Carbon $from, Carbon $to, string $granularity, array $rows): array
    {
        $interval = $granularity === 'month' ? '1 month' : '1 day';
        $format = $granularity === 'month' ? 'Y-m' : 'Y-m-d';
        $display = $granularity === 'month' ? 'M Y' : 'M j';
        $series = [];

        foreach (CarbonPeriod::create($from->copy()->startOfDay(), $interval, $to) as $moment) {
            $key = $moment->format($format);
            $series[] = [
                'label' => $moment->format($display),
                'value' => (int) ($rows[$key] ?? 0),
            ];
        }

        return $series;
    }

    private function bucketSql(string $column, string $granularity): string
    {
        $driver = DB::connection()->getDriverName();
        $qualified = $column;

        if (!str_contains($column, '.')) {
            $qualified = $column;
        }

        if ($driver === 'sqlite') {
            return $granularity === 'month'
                ? "strftime('%Y-%m', {$qualified})"
                : "strftime('%Y-%m-%d', {$qualified})";
        }

        return $granularity === 'month'
            ? "DATE_FORMAT({$qualified}, '%Y-%m')"
            : "DATE_FORMAT({$qualified}, '%Y-%m-%d')";
    }

    /**
     * @return array{key: string, label: string, value: int}
     */
    private function card(string $key, string $label, int $value): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'value' => $value,
        ];
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

    /**
     * @param  list<array<string, mixed>>  $items
     * @return array{title: string, items: list<array<string, mixed>>}
     */
    private function section(string $title, array $items): array
    {
        return [
            'title' => $title,
            'items' => $items,
        ];
    }

    private function roleLabel(string $slug): string
    {
        return match ($slug) {
            Role::SUPER_ADMIN => 'Super Admin',
            Role::EVENT_ADMIN => 'Event Admin',
            Role::VEHICLE_ADMIN => 'Vehicle Admin',
            Role::EVENT_APPROVAL_ADMIN => 'Event Approval Admin',
            Role::VEHICLE_APPROVAL_ADMIN => 'Vehicle Approval Admin',
            Role::DEAN_OFFICE_HEAD => 'Dean / Office Head',
            Role::FACULTY_STAFF => 'Faculty / Staff',
            Role::STUDENT_REPUBLIC => 'Student Republic',
            default => 'User',
        };
    }

    private function periodLabel(string $period): string
    {
        return match ($period) {
            '7d' => 'Last 7 days',
            '6m' => 'Last 6 months',
            '12m' => 'Last 12 months',
            default => 'Last 30 days',
        };
    }
}
