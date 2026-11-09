<?php

namespace App\Reports;

use App\Models\EventBooking;
use App\Models\User;
use App\Permissions\Permission;
use App\Permissions\PermissionChecker;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EventReportQuery
{
    public const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

    public const SORTABLE = [
        'event_booking_id',
        'purpose',
        'requested_by',
        'status',
        'approval_stage',
        'date_start',
        'date_end',
        'office_name',
        'venue',
    ];

    public function authorize(User $user): void
    {
        abort_unless($user->allows(Permission::REPORTS_VIEW), 403, 'This action is unauthorized.');
        abort_unless($this->canAccessEventReports($user), 403, 'This action is unauthorized.');
    }

    public function canAccessEventReports(User $user): bool
    {
        return $user->allows(Permission::REPORTS_VIEW_ALL)
            || $user->allows(Permission::REPORTS_VIEW_EVENT)
            || $user->allows(Permission::REPORTS_VIEW_OFFICE);
    }

    public function canFilterOffices(User $user): bool
    {
        return $user->allows(Permission::REPORTS_VIEW_ALL)
            || $user->allows(Permission::REPORTS_VIEW_EVENT);
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
            'venue_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:150'],
            'list' => ['nullable', 'in:upcoming,past'],
            'granularity' => ['nullable', 'in:day,week,month,year'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'sort' => ['nullable', 'in:'.implode(',', self::SORTABLE)],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);
    }

    public function bookings(User $user, array $filters): Builder
    {
        $query = EventBooking::query()->where('tbl_event_bookings.is_deleted', false);
        $query = $this->constrain($query, $user);
        $query = $this->applyFilters($query, $user, $filters);

        return $query;
    }

    private function constrain(Builder $query, User $user): Builder
    {
        $checker = app(PermissionChecker::class);
        $columns = [
            'office_id' => 'tbl_event_bookings.office_id',
            'owner_id' => 'tbl_event_bookings.requested_by_user_id',
        ];

        if ($user->allows(Permission::REPORTS_VIEW_ALL) || $user->allows(Permission::REPORTS_VIEW_EVENT)) {
            if ($user->allows(Permission::EVENT_BOOKINGS_VIEW)) {
                return $checker->constrainQuery($query, $user, Permission::EVENT_BOOKINGS_VIEW, $columns);
            }

            if ($user->allows(Permission::EVENT_APPROVALS_VIEW)) {
                return $checker->constrainQuery($query, $user, Permission::EVENT_APPROVALS_VIEW, $columns);
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
            $query->whereDate('tbl_event_bookings.date_end', '>=', $start);
        }

        if ($end) {
            $query->whereDate('tbl_event_bookings.date_start', '<=', $end);
        }

        if (!empty($filters['status'])) {
            $query->where('tbl_event_bookings.status', $filters['status']);
        }

        $venueId = $filters['venue_id'] ?? null;
        if ($venueId) {
            $query->where('tbl_event_bookings.venue_id', (int) $venueId);
        }

        $officeId = $this->authorizedOfficeId($user, $filters['office_id'] ?? null);
        if ($officeId !== null) {
            $query->where('tbl_event_bookings.office_id', $officeId);
        }

        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $query->where(function (Builder $inner) use ($search) {
                $inner->where('tbl_event_bookings.purpose', 'like', "%{$search}%")
                    ->orWhere('tbl_event_bookings.requested_by', 'like', "%{$search}%")
                    ->orWhereHas('venue', function (Builder $venue) use ($search) {
                        $venue->where('venue', 'like', "%{$search}%");
                    })
                    ->orWhereHas('office', function (Builder $office) use ($search) {
                        $office->where('office_name', 'like', "%{$search}%")
                            ->orWhere('office_code', 'like', "%{$search}%");
                    });
            });
        }

        $list = $filters['list'] ?? null;
        if ($list === 'upcoming') {
            $query->where('tbl_event_bookings.status', 'approved')
                ->whereDate('tbl_event_bookings.date_end', '>=', now()->toDateString());
        }

        if ($list === 'past') {
            $query->whereDate('tbl_event_bookings.date_end', '<', now()->toDateString());
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

    /**
     * @throws ValidationException
     */
    public function sortColumn(array $filters): string
    {
        $sort = $filters['sort'] ?? 'date_start';

        if (!in_array($sort, self::SORTABLE, true)) {
            return 'tbl_event_bookings.date_start';
        }

        return match ($sort) {
            'office_name' => 'tbl_offices.office_name',
            'venue' => 'tbl_venues.venue',
            default => 'tbl_event_bookings.'.$sort,
        };
    }

    public function sortDirection(array $filters): string
    {
        return ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
    }
}
