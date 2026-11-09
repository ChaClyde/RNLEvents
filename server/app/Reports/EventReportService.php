<?php

namespace App\Reports;

use App\Models\Office;
use App\Models\User;
use App\Models\Venue;
use App\Permissions\Permission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class EventReportService
{
    public function __construct(private readonly EventReportQuery $query)
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
            ->where('tbl_event_bookings.status', 'approved')
            ->whereDate('tbl_event_bookings.date_end', '<', now()->toDateString())
            ->count();

        return [
            'cards' => [
                ['key' => 'total', 'label' => 'Total Event Bookings', 'value' => array_sum($counts)],
                ['key' => 'pending', 'label' => 'Pending Bookings', 'value' => $counts['pending'] ?? 0],
                ['key' => 'approved', 'label' => 'Approved Bookings', 'value' => $counts['approved'] ?? 0],
                ['key' => 'rejected', 'label' => 'Rejected Bookings', 'value' => $counts['rejected'] ?? 0],
                ['key' => 'cancelled', 'label' => 'Cancelled Bookings', 'value' => $counts['cancelled'] ?? 0],
                ['key' => 'completed', 'label' => 'Completed / Past Events', 'value' => $completed],
            ],
            'limited' => $user->isLimited(Permission::REPORTS_VIEW_EVENT)
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

        return [
            'daily' => $this->chart('Daily Event Booking Trends', $this->trendSeries($base, 'day')),
            'weekly' => $this->chart('Weekly Event Booking Trends', $this->trendSeries($base, 'week')),
            'monthly' => $this->chart('Monthly Event Booking Trends', $this->trendSeries($base, 'month')),
            'yearly' => $this->chart('Yearly Event Booking Trends', $this->trendSeries($base, 'year')),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function venues(User $user, array $filters): array
    {
        $rows = $this->venueCounts($user, $filters);
        $ranked = $rows->sortByDesc('value')->values();
        $least = $rows->sortBy('value')->values();

        return [
            'most_frequent' => $ranked->take(8)->values()->all(),
            'least_utilized' => $least->take(8)->values()->all(),
            'frequency' => $this->chart('Venue Booking Frequency', $ranked->take(12)->values()->all()),
            'distribution' => $this->chart('Venue Reservation Distribution', $ranked->take(12)->values()->all()),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    public function offices(User $user, array $filters): array
    {
        $rows = $this->query->bookings($user, $filters)
            ->leftJoin('tbl_offices', 'tbl_offices.office_id', '=', 'tbl_event_bookings.office_id')
            ->selectRaw("
                tbl_event_bookings.office_id as office_id,
                COALESCE(tbl_offices.office_name, 'Unassigned') as office_name,
                COUNT(*) as total,
                SUM(CASE WHEN tbl_event_bookings.status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN tbl_event_bookings.status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN tbl_event_bookings.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN tbl_event_bookings.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            ")
            ->groupBy('tbl_event_bookings.office_id', 'tbl_offices.office_name')
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
            ->leftJoin('tbl_venues', 'tbl_venues.venue_id', '=', 'tbl_event_bookings.venue_id')
            ->leftJoin('tbl_offices', 'tbl_offices.office_id', '=', 'tbl_event_bookings.office_id')
            ->select([
                'tbl_event_bookings.event_booking_id',
                'tbl_event_bookings.purpose',
                'tbl_event_bookings.requested_by',
                'tbl_event_bookings.status',
                'tbl_event_bookings.approval_stage',
                'tbl_event_bookings.date_start',
                'tbl_event_bookings.date_end',
                'tbl_event_bookings.office_id',
                'tbl_event_bookings.venue_id',
                'tbl_offices.office_name',
                'tbl_venues.venue',
            ])
            ->orderBy($sort, $direction)
            ->orderBy('tbl_event_bookings.event_booking_id', 'desc')
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
        $venues = $this->venues($user, $filters);
        $offices = $this->offices($user, $filters);
        $rows = $this->allBookingRows($user, $filters);

        return [
            'module' => 'events',
            'title' => 'FilSched Event Report',
            'organization' => 'Filamer Christian University Inc.',
            'report_type' => 'Event Reports',
            'generated_at' => now()->format('Y-m-d H:i'),
            'date_range' => ReportExportSupport::dateRangeLabel($filters),
            'filters' => $this->describeFilters($user, $filters),
            'cards' => $summary['cards'],
            'venues_most' => $venues['most_frequent'],
            'venues_least' => $venues['least_utilized'],
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
            ->leftJoin('tbl_venues', 'tbl_venues.venue_id', '=', 'tbl_event_bookings.venue_id')
            ->leftJoin('tbl_offices', 'tbl_offices.office_id', '=', 'tbl_event_bookings.office_id')
            ->select([
                'tbl_event_bookings.event_booking_id',
                'tbl_event_bookings.purpose',
                'tbl_event_bookings.requested_by',
                'tbl_event_bookings.status',
                'tbl_event_bookings.approval_stage',
                'tbl_event_bookings.date_start',
                'tbl_event_bookings.date_end',
                'tbl_event_bookings.office_id',
                'tbl_event_bookings.venue_id',
                'tbl_offices.office_name',
                'tbl_venues.venue',
            ])
            ->orderBy($sort, $direction)
            ->orderBy('tbl_event_bookings.event_booking_id', 'desc')
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
            ->selectRaw('tbl_event_bookings.status as status, COUNT(*) as aggregate')
            ->groupBy('tbl_event_bookings.status')
            ->pluck('aggregate', 'status')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    /**
     * @return list<array{label: string, value: int}>
     */
    private function trendSeries(Builder $query, string $granularity): array
    {
        $sql = $this->bucketSql('tbl_event_bookings.date_start', $granularity);

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
    private function venueCounts(User $user, array $filters)
    {
        $bookingCounts = $this->query->bookings($user, $filters)
            ->leftJoin('tbl_venues', 'tbl_venues.venue_id', '=', 'tbl_event_bookings.venue_id')
            ->selectRaw("COALESCE(tbl_venues.venue, 'Unassigned') as label, COUNT(*) as aggregate")
            ->groupBy(DB::raw("COALESCE(tbl_venues.venue, 'Unassigned')"))
            ->pluck('aggregate', 'label')
            ->map(fn ($count) => (int) $count);

        if ($user->allows(Permission::VENUES_VIEW) && $this->query->canFilterOffices($user)) {
            Venue::query()
                ->where('is_deleted', false)
                ->orderBy('venue')
                ->get(['venue'])
                ->each(function (Venue $venue) use ($bookingCounts) {
                    if (!$bookingCounts->has($venue->venue)) {
                        $bookingCounts[$venue->venue] = 0;
                    }
                });
        }

        return $bookingCounts->map(fn ($value, $label) => [
            'label' => (string) $label,
            'value' => (int) $value,
        ])->values();
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

        $venues = [];
        if ($user->allows(Permission::VENUES_VIEW)) {
            $venues = Venue::query()
                ->where('is_deleted', false)
                ->orderBy('venue')
                ->get(['venue_id', 'venue'])
                ->map(fn (Venue $venue) => [
                    'venue_id' => $venue->venue_id,
                    'venue' => $venue->venue,
                ])
                ->all();
        }

        return [
            'can_filter_offices' => $canFilterOffices,
            'can_filter_venues' => $user->allows(Permission::VENUES_VIEW),
            'locked_office_id' => $canFilterOffices ? null : $user->office_id,
            'offices' => $offices,
            'venues' => $venues,
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
            'event_booking_id' => (int) $row->event_booking_id,
            'purpose' => $row->purpose,
            'requested_by' => $row->requested_by,
            'office' => $row->office_name,
            'venue' => $row->venue,
            'date_start' => $this->dateString($row->date_start),
            'date_end' => $this->dateString($row->date_end),
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

        $venueId = $filters['venue_id'] ?? null;
        $venueName = 'All venues';
        if ($venueId) {
            $venueName = Venue::query()->where('venue_id', (int) $venueId)->value('venue') ?: 'Venue #'.$venueId;
        }

        $list = $filters['list'] ?? '';

        return [
            ['label' => 'Date range', 'value' => ReportExportSupport::dateRangeLabel($filters)],
            ['label' => 'Status', 'value' => !empty($filters['status']) ? ucfirst((string) $filters['status']) : 'All statuses'],
            ['label' => 'Office', 'value' => $officeName],
            ['label' => 'Venue', 'value' => $venueName],
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
