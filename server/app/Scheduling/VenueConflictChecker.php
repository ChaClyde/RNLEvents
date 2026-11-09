<?php

namespace App\Scheduling;

use App\Models\EventBooking;
use App\Models\User;
use App\Permissions\Permission;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class VenueConflictChecker
{
    /**
     * @return Collection<int, EventBooking>
     */
    public function find(
        int $venueId,
        mixed $dateStart,
        mixed $dateEnd,
        mixed $timeStart,
        mixed $timeEnd,
        ?int $excludeBookingId = null,
        bool $lockRows = false,
    ): Collection {
        $start = SchedulePeriod::combine($dateStart, $timeStart);
        $end = SchedulePeriod::combine($dateEnd, $timeEnd);

        $query = EventBooking::query()
            ->with(['venue:venue_id,venue,location', 'office:office_id,office_name,office_code'])
            ->where('venue_id', $venueId)
            ->where('is_deleted', false)
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('date_start', '<=', $end->toDateString())
            ->whereDate('date_end', '>=', $start->toDateString())
            ->orderBy('event_booking_id');

        if ($excludeBookingId !== null) {
            $query->where('event_booking_id', '!=', $excludeBookingId);
        }

        if ($lockRows) {
            $query->lockForUpdate();
        }

        return $query->get()->filter(
            fn (EventBooking $booking) => SchedulePeriod::overlaps(
                $start,
                $end,
                $this->bookingStartsAt($booking),
                $this->bookingEndsAt($booking),
            )
        )->values();
    }

    public function assertAvailable(
        User $viewer,
        int $venueId,
        mixed $dateStart,
        mixed $dateEnd,
        mixed $timeStart,
        mixed $timeEnd,
        ?int $excludeBookingId = null,
    ): void {
        $conflicts = $this->find(
            $venueId,
            $dateStart,
            $dateEnd,
            $timeStart,
            $timeEnd,
            $excludeBookingId,
            true,
        );

        if ($conflicts->isEmpty()) {
            return;
        }

        ConflictResponse::throw(
            $viewer,
            'venue_id',
            'This venue already has a pending or approved booking during the selected schedule.',
            Permission::EVENT_BOOKINGS_VIEW,
            $conflicts,
            fn (EventBooking $booking) => $this->detailed($booking),
            fn (EventBooking $booking) => $this->sanitized($booking),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function detailed(EventBooking $booking): array
    {
        return [
            'type' => 'event_booking',
            'id' => $booking->event_booking_id,
            'purpose' => $booking->purpose,
            'status' => $booking->status,
            'date_start' => $booking->date_start?->toDateString(),
            'date_end' => $booking->date_end?->toDateString(),
            'time_start' => $this->timeValue($booking->time_start),
            'time_end' => $this->timeValue($booking->time_end),
            'requested_by' => $booking->requested_by,
            'office' => $booking->office?->office_name,
            'venue' => $booking->venue?->venue,
            'visible' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function sanitized(EventBooking $booking): array
    {
        return [
            'type' => 'event_booking',
            'id' => null,
            'purpose' => 'Reserved',
            'status' => $booking->status,
            'date_start' => $booking->date_start?->toDateString(),
            'date_end' => $booking->date_end?->toDateString(),
            'time_start' => $this->timeValue($booking->time_start),
            'time_end' => $this->timeValue($booking->time_end),
            'requested_by' => null,
            'office' => null,
            'venue' => $booking->venue?->venue,
            'visible' => false,
        ];
    }

    private function bookingStartsAt(EventBooking $booking): Carbon
    {
        return SchedulePeriod::combine($booking->date_start, $booking->time_start);
    }

    private function bookingEndsAt(EventBooking $booking): Carbon
    {
        return SchedulePeriod::combine($booking->date_end, $booking->time_end);
    }

    private function timeValue(mixed $time): string
    {
        if ($time instanceof Carbon) {
            return $time->format('H:i:s');
        }

        return is_string($time) ? $time : (string) $time;
    }
}
