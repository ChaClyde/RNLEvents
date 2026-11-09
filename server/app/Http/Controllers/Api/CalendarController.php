<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Event;
use App\Models\EventBooking;
use App\Models\User;
use App\Models\VehicleBooking;
use App\Permissions\Permission;
use App\Scheduling\SchedulePeriod;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    use ScopesQueriesByPermission;

    public function index(Request $request)
    {
        $validated = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'type' => ['nullable', 'in:event,event_booking,vehicle_booking,driver'],
        ]);

        $user = $request->user();
        $from = $validated['from'];
        $to = $validated['to'];
        $type = $validated['type'] ?? null;
        $items = [];

        if ($type === null || $type === 'event_booking') {
            $items = array_merge($items, $this->eventBookings($user, $from, $to));
        }

        if ($type === null || $type === 'vehicle_booking') {
            $items = array_merge($items, $this->vehicleBookings($user, $from, $to));
        }

        if ($type === null || $type === 'event') {
            $items = array_merge($items, $this->events($user, $from, $to));
        }

        if ($type === null || $type === 'driver') {
            $items = array_merge($items, $this->driverUnavailability($user, $from, $to));
        }

        return response()->json([
            'message' => 'Calendar loaded successfully.',
            'data' => $items,
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function eventBookings(User $user, string $from, string $to): array
    {
        if (
            !$user->allows(Permission::EVENT_BOOKINGS_VIEW)
            && !$user->allows(Permission::EVENT_APPROVALS_VIEW)
        ) {
            return [];
        }

        $query = EventBooking::query()
            ->with(['venue:venue_id,venue,location', 'office:office_id,office_name'])
            ->where('is_deleted', false)
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('date_start', '<=', $to)
            ->whereDate('date_end', '>=', $from);

        $query = $this->constrainByPermission(
            $query,
            $user,
            Permission::EVENT_BOOKINGS_VIEW,
            Permission::EVENT_APPROVALS_VIEW,
        );

        return $query->get()->map(function (EventBooking $booking) {
            return [
                'id' => 'event-booking-' . $booking->event_booking_id,
                'type' => 'event_booking',
                'title' => $booking->purpose,
                'status' => $booking->status,
                'start' => SchedulePeriod::combine($booking->date_start, $booking->time_start)->toIso8601String(),
                'end' => SchedulePeriod::combine($booking->date_end, $booking->time_end)->toIso8601String(),
                'resource_label' => $booking->venue?->venue,
                'office' => $booking->office?->office_name,
                'requested_by' => $booking->requested_by,
            ];
        })->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function vehicleBookings(User $user, string $from, string $to): array
    {
        if (
            !$user->allows(Permission::VEHICLE_BOOKINGS_VIEW)
            && !$user->allows(Permission::VEHICLE_APPROVALS_VIEW)
        ) {
            return [];
        }

        $query = VehicleBooking::query()
            ->with([
                'vehicle:vehicle_id,vehicle_name,plate_number',
                'driver:driver_id,driver_name',
                'office:office_id,office_name',
            ])
            ->where('is_deleted', false)
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('travel_date', '<=', $to)
            ->whereDate('expected_return_date', '>=', $from);

        $query = $this->constrainByPermission(
            $query,
            $user,
            Permission::VEHICLE_BOOKINGS_VIEW,
            Permission::VEHICLE_APPROVALS_VIEW,
        );

        return $query->get()->map(function (VehicleBooking $booking) {
            $resource = collect([
                $booking->vehicle?->vehicle_name,
                $booking->driver?->driver_name,
            ])->filter()->implode(' · ');

            return [
                'id' => 'vehicle-booking-' . $booking->vehicle_booking_id,
                'type' => 'vehicle_booking',
                'title' => $booking->purpose,
                'status' => $booking->status,
                'start' => $booking->tripStartsAt()->toIso8601String(),
                'end' => $booking->tripEndsAt()->toIso8601String(),
                'resource_label' => $resource !== '' ? $resource : 'Unassigned',
                'office' => $booking->office?->office_name,
                'requested_by' => $booking->requested_by,
                'destination' => $booking->destination,
            ];
        })->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function events(User $user, string $from, string $to): array
    {
        if (!$user->allows(Permission::EVENTS_VIEW)) {
            return [];
        }

        return Event::query()
            ->with(['venue:venue_id,venue'])
            ->where('is_deleted', false)
            ->whereDate('date_start', '<=', $to)
            ->whereDate('date_end', '>=', $from)
            ->get()
            ->map(function (Event $event) {
                return [
                    'id' => 'event-' . $event->event_id,
                    'type' => 'event',
                    'title' => $event->purpose,
                    'status' => 'scheduled',
                    'start' => SchedulePeriod::combine($event->date_start, $event->time_start)->toIso8601String(),
                    'end' => SchedulePeriod::combine($event->date_end, $event->time_end)->toIso8601String(),
                    'resource_label' => $event->venue?->venue,
                    'office' => null,
                    'requested_by' => $event->requested_by,
                ];
            })
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function driverUnavailability(User $user, string $from, string $to): array
    {
        if (!$user->allows(Permission::DRIVERS_VIEW)) {
            return [];
        }

        return Driver::query()
            ->where('is_deleted', false)
            ->where('driver_status', '!=', 'Available')
            ->get()
            ->map(function (Driver $driver) use ($from, $to) {
                $start = $driver->status_start_date?->toDateString() ?? $from;
                $end = $driver->status_end_date?->toDateString() ?? $to;

                if ($end < $from || $start > $to) {
                    return null;
                }

                $reason = trim((string) $driver->status_remarks);

                return [
                    'id' => 'driver-unavailable-' . $driver->driver_id,
                    'type' => 'driver',
                    'title' => $driver->driver_name . ' · ' . $driver->driver_status,
                    'status' => 'unavailable',
                    'start' => $start . 'T00:00:00',
                    'end' => $end . 'T23:59:59',
                    'resource_label' => $driver->driver_name,
                    'unavailability_reason' => $reason !== '' ? $reason : $driver->driver_status,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }
}
