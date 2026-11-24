<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Event;
use App\Models\EventBooking;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Models\VehicleMaintenance;
use App\Models\Venue;
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
            $items = array_merge(
                $items,
                $this->vehicleBookings($user, $from, $to),
                $this->vehicleUnavailability($user, $from, $to),
            );
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

    public function options(Request $request)
    {
        $user = $request->user();

        $venues = $this->canFilterVenues($user)
            ? Venue::query()
                ->where('is_deleted', false)
                ->orderBy('venue')
                ->get(['venue_id', 'venue'])
            : [];

        $vehicles = $this->canFilterVehicles($user)
            ? Vehicle::query()
                ->where('is_deleted', false)
                ->orderBy('vehicle_name')
                ->get(['vehicle_id', 'vehicle_name', 'plate_number'])
            : [];

        $drivers = $this->canFilterDrivers($user)
            ? Driver::query()
                ->where('is_deleted', false)
                ->orderBy('driver_name')
                ->get(['driver_id', 'driver_name'])
            : [];

        return response()->json([
            'message' => 'Calendar filters loaded successfully.',
            'venues' => $venues,
            'vehicles' => $vehicles,
            'drivers' => $drivers,
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
                'venue_id' => $booking->venue_id,
                'vehicle_id' => null,
                'driver_id' => null,
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
                'venue_id' => null,
                'vehicle_id' => $booking->vehicle_id,
                'driver_id' => $booking->driver_id,
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

        $query = $this->constrainByPermission(
            Event::query()
                ->with(['venue:venue_id,venue'])
                ->where('is_deleted', false)
                ->where('status', 'approved')
                ->whereDate('date_start', '<=', $to),
            $user,
            Permission::EVENTS_VIEW,
        );

        return $query
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
                    'venue_id' => $event->venue_id,
                    'vehicle_id' => null,
                    'driver_id' => null,
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
    private function vehicleUnavailability(User $user, string $from, string $to): array
    {
        if (!$user->allows(Permission::VEHICLES_VIEW) && !$user->allows(Permission::VEHICLE_BOOKINGS_VIEW)) {
            return [];
        }

        $items = Vehicle::query()
            ->where('is_deleted', false)
            ->whereIn('status', ['unavailable', 'maintenance'])
            ->get()
            ->map(function (Vehicle $vehicle) use ($from, $to) {
                $label = $vehicle->status === 'maintenance' ? 'Under maintenance' : 'Unavailable';

                return [
                    'id' => 'vehicle-status-' . $vehicle->vehicle_id,
                    'type' => 'vehicle_booking',
                    'title' => $vehicle->vehicle_name . ' · ' . $label,
                    'status' => 'unavailable',
                    'start' => $from . 'T00:00:00',
                    'end' => $to . 'T23:59:59',
                    'vehicle_id' => $vehicle->vehicle_id,
                    'driver_id' => null,
                    'resource_label' => $vehicle->vehicle_name,
                    'unavailability_reason' => $label,
                ];
            })
            ->all();

        $maintenance = VehicleMaintenance::query()
            ->with('vehicle:vehicle_id,vehicle_name')
            ->where('status', 'scheduled')
            ->whereDate('date_start', '<=', $to)
            ->whereDate('date_end', '>=', $from)
            ->get();

        foreach ($maintenance as $row) {
            $items[] = [
                'id' => 'vehicle-maintenance-' . $row->maintenance_id,
                'type' => 'vehicle_booking',
                'title' => ($row->vehicle?->vehicle_name ?? 'Vehicle') . ' · Under maintenance',
                'status' => 'unavailable',
                'start' => $row->date_start->toDateString() . 'T00:00:00',
                'end' => $row->date_end->toDateString() . 'T23:59:59',
                'vehicle_id' => $row->vehicle_id,
                'driver_id' => null,
                'resource_label' => $row->vehicle?->vehicle_name,
                'unavailability_reason' => $row->reason,
            ];
        }

        return $items;
    }

    private function driverUnavailability(User $user, string $from, string $to): array
    {
        if (!$user->allows(Permission::DRIVERS_VIEW) && !$user->allows(Permission::VEHICLE_BOOKINGS_VIEW)) {
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
                    'venue_id' => null,
                    'vehicle_id' => null,
                    'driver_id' => $driver->driver_id,
                    'resource_label' => $driver->driver_name,
                    'unavailability_reason' => $reason !== '' ? $reason : $driver->driver_status,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    private function canFilterVenues(User $user): bool
    {
        return $user->allows(Permission::EVENTS_VIEW)
            || $user->allows(Permission::EVENT_BOOKINGS_VIEW)
            || $user->allows(Permission::EVENT_APPROVALS_VIEW);
    }

    private function canFilterVehicles(User $user): bool
    {
        return $user->allows(Permission::VEHICLES_VIEW)
            || $user->allows(Permission::VEHICLE_BOOKINGS_VIEW)
            || $user->allows(Permission::VEHICLE_APPROVALS_VIEW);
    }

    private function canFilterDrivers(User $user): bool
    {
        return $user->allows(Permission::DRIVERS_VIEW)
            || $user->allows(Permission::VEHICLE_BOOKINGS_VIEW)
            || $user->allows(Permission::VEHICLE_APPROVALS_VIEW);
    }
}
