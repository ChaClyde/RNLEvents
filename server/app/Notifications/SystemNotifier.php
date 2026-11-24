<?php

namespace App\Notifications;

use App\Models\Announcement;
use App\Models\EventBooking;
use App\Models\Role;
use App\Models\SystemNotification;
use App\Models\User;
use App\Models\VehicleBooking;
use App\Permissions\ApprovalStage;
use Illuminate\Support\Collection;

class SystemNotifier
{
    public function bookingSubmitted(EventBooking|VehicleBooking $booking, User $actor): void
    {
        $module = $booking instanceof EventBooking ? 'event' : 'vehicle';
        $this->notify(
            $this->recipients(ApprovalStage::OFFICE_HEAD, $booking->office_id, $actor->user_id),
            'booking_submitted',
            $module === 'event' ? 'New event booking' : 'New vehicle booking',
            $this->summary($booking).' is waiting for the office head.',
            $this->approverLink($module),
        );
    }

    public function bookingDecided(EventBooking|VehicleBooking $booking, User $actor): void
    {
        $module = $booking instanceof EventBooking ? 'event' : 'vehicle';
        $summary = $this->summary($booking);

        if ($booking->status === 'approved') {
            $this->notify(
                $this->requester($booking, $actor->user_id),
                'booking_approved',
                $module === 'event' ? 'Event booking approved' : 'Vehicle booking approved',
                $summary.' has been approved.',
                $this->requesterLink($module),
            );

            return;
        }

        if ($booking->status === 'rejected') {
            $this->notify(
                $this->requester($booking, $actor->user_id),
                'booking_rejected',
                $module === 'event' ? 'Event booking rejected' : 'Vehicle booking rejected',
                $summary.' was rejected.'.($booking->approval_remarks ? ' '.$booking->approval_remarks : ''),
                $this->requesterLink($module),
            );

            return;
        }

        if ($booking->status === 'cancelled') {
            $this->notify(
                $this->requester($booking, $actor->user_id),
                'booking_cancelled',
                $module === 'event' ? 'Event booking cancelled' : 'Vehicle booking cancelled',
                $summary.' was cancelled.',
                $this->requesterLink($module),
            );
            $this->notify(
                $this->recipients((string) $booking->approval_stage, $booking->office_id, $actor->user_id),
                'booking_cancelled',
                $module === 'event' ? 'Event booking cancelled' : 'Vehicle booking cancelled',
                $summary.' was cancelled and left your queue.',
                $this->approverLink($module),
            );

            return;
        }

        $this->notify(
            $this->recipients((string) $booking->approval_stage, $booking->office_id, $actor->user_id),
            'booking_advanced',
            $module === 'event' ? 'Event booking needs your review' : 'Vehicle booking needs your review',
            $summary.' moved to your approval step.',
            $this->approverLink($module),
        );
    }

    public function announcementPosted(Announcement $announcement, User $actor): void
    {
        $recipients = User::query()
            ->where('is_deleted', false)
            ->where('account_status', 'Active')
            ->where('user_id', '!=', $actor->user_id)
            ->pluck('user_id');

        $this->notify(
            $recipients,
            'announcement',
            'New announcement',
            $announcement->title,
            '/announcements',
        );
    }

    /**
     * @param  Collection<int, int>|list<int>  $userIds
     */
    private function notify(Collection|array $userIds, string $kind, string $title, string $body, string $link): void
    {
        $ids = collect($userIds)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return;
        }

        $now = now();
        $rows = $ids->map(fn ($id) => [
            'user_id' => (int) $id,
            'kind' => $kind,
            'title' => mb_substr($title, 0, 150),
            'body' => mb_substr($body, 0, 500),
            'link' => $link,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        SystemNotification::query()->insert($rows);
    }

    /**
     * @return Collection<int, int>
     */
    private function recipients(string $stage, ?int $officeId, int $exceptUserId): Collection
    {
        $role = match ($stage) {
            ApprovalStage::OFFICE_HEAD => Role::DEAN_OFFICE_HEAD,
            ApprovalStage::EVENT_ADMIN => Role::EVENT_ADMIN,
            ApprovalStage::EVENT_APPROVAL, ApprovalStage::VEHICLE_APPROVAL => Role::ADMIN_APPROVALS,
            ApprovalStage::VEHICLE_ADMIN => Role::VEHICLE_ADMIN,
            ApprovalStage::OIC_BUDGET => Role::OIC_BUDGET,
            ApprovalStage::SUPER_ADMIN => Role::SUPER_ADMIN,
            default => null,
        };

        if ($role === null) {
            return collect();
        }

        $query = User::query()
            ->where('is_deleted', false)
            ->where('account_status', 'Active')
            ->where('user_id', '!=', $exceptUserId)
            ->whereHas('role', fn ($roles) => $roles->where('slug', $role));

        if ($stage === ApprovalStage::OFFICE_HEAD && $officeId) {
            $query->where('office_id', $officeId);
        }

        return $query->pluck('user_id');
    }

    /**
     * @return list<int>
     */
    private function requester(EventBooking|VehicleBooking $booking, int $exceptUserId): array
    {
        $id = (int) $booking->requested_by_user_id;

        return $id > 0 && $id !== $exceptUserId ? [$id] : [];
    }

    private function summary(EventBooking|VehicleBooking $booking): string
    {
        if ($booking instanceof EventBooking) {
            return '“'.$booking->purpose.'”';
        }

        $place = $booking->destination ? ' to '.$booking->destination : '';

        return '“'.$booking->purpose.'”'.$place;
    }

    private function approverLink(string $module): string
    {
        return $module === 'event' ? '/approvals/venues' : '/approvals/vehicles';
    }

    private function requesterLink(string $module): string
    {
        return $module === 'event' ? '/event-bookings' : '/vehicle-bookings';
    }
}
