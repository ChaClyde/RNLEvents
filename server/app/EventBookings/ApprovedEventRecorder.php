<?php

namespace App\EventBookings;

use App\Models\Event;
use App\Models\EventBooking;
use App\Models\EventBookingApproval;
use App\Permissions\ApprovalStage;

/**
 * The event list only receives a booking after every approver has approved it.
 */
final class ApprovedEventRecorder
{
    public function record(EventBooking $booking): Event
    {
        $booking->loadMissing(['resources', 'approvals']);
        $equipment = $this->equipment($booking);
        $approvedAt = $booking->approvals
            ->first(fn (EventBookingApproval $row) => $row->approval_stage === ApprovalStage::SUPER_ADMIN
                && $row->decision_slot === null
                && $row->action === EventBookingApproval::ACTION_APPROVED)
            ?->created_at;

        return Event::query()->updateOrCreate(
            ['event_booking_id' => $booking->event_booking_id],
            [
                'purpose' => $booking->purpose,
                'venue_id' => $booking->venue_id,
                'time_start' => $booking->time_start,
                'time_end' => $booking->time_end,
                'date_start' => $booking->date_start,
                'date_end' => $booking->date_end,
                'number_of_days' => $booking->number_of_days,
                'status' => 'approved',
                'approved_at' => $approvedAt ?? now(),
                'chairs' => $equipment['chairs'],
                'tables' => $equipment['tables'],
                'lights_and_sounds' => $equipment['lights_and_sounds'],
                'multimedia_projector' => $equipment['multimedia_projector'],
                'others_specify' => $equipment['others_specify'],
                'others_quantity' => $equipment['others_quantity'],
                'requested_by' => $booking->requested_by,
                'requested_by_user_id' => $booking->requested_by_user_id,
                'office_id' => $booking->office_id,
                'email' => $booking->email,
                'tel_number' => $booking->tel_number,
                'is_deleted' => false,
            ],
        );
    }

    public function withdraw(EventBooking $booking): void
    {
        Event::query()
            ->where('event_booking_id', $booking->event_booking_id)
            ->update([
                'status' => 'cancelled',
                'is_deleted' => true,
            ]);
    }

    /**
     * @return array{
     *     chairs: int,
     *     tables: int,
     *     lights_and_sounds: bool,
     *     multimedia_projector: bool,
     *     others_specify: ?string,
     *     others_quantity: ?int
     * }
     */
    private function equipment(EventBooking $booking): array
    {
        $chairs = 0;
        $tables = 0;
        $lights = false;
        $projector = false;
        $others = [];
        $othersQuantity = 0;

        foreach ($booking->resources as $resource) {
            $name = strtolower((string) $resource->resource_name);
            $quantity = max(0, (int) $resource->quantity);

            if (str_contains($name, 'chair')) {
                $chairs += $quantity;
            } elseif (str_contains($name, 'table')) {
                $tables += $quantity;
            } elseif (str_contains($name, 'light') || str_contains($name, 'sound')) {
                $lights = true;
            } elseif (str_contains($name, 'projector')) {
                $projector = true;
            } else {
                $others[] = trim((string) $resource->resource_name);
                $othersQuantity += $quantity;
            }
        }

        $others = array_values(array_filter($others, fn (string $name) => $name !== ''));

        return [
            'chairs' => $chairs,
            'tables' => $tables,
            'lights_and_sounds' => $lights,
            'multimedia_projector' => $projector,
            'others_specify' => $others === [] ? null : mb_substr(implode(', ', $others), 0, 150),
            'others_quantity' => $othersQuantity > 0 ? $othersQuantity : null,
        ];
    }
}
