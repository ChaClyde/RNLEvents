<?php

namespace App\EventBookings;

use App\Models\EventBooking;
use App\Models\EventBookingApproval;
use App\Models\User;
use App\Permissions\ApprovalStage;
use App\Permissions\Permission;
use App\Permissions\PermissionContext;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class EventApprovalWorkflow
{
    /**
     * @param  array{approval_remarks?: mixed, cancellation_reason?: mixed}  $input
     */
    public function apply(User $actor, EventBooking $booking, string $action, array $input): EventBooking
    {
        unset(
            $input['approval_stage'],
            $input['approved_by'],
            $input['approved_by_user_id'],
            $input['approver_user_id'],
            $input['approver_id'],
            $input['emergency_bypass'],
        );

        return match ($action) {
            EventBookingApproval::ACTION_APPROVED => $this->approve($actor, $booking, $input),
            EventBookingApproval::ACTION_REJECTED => $this->reject($actor, $booking, $input),
            'cancelled' => $this->cancel($actor, $booking, $input),
            default => throw ValidationException::withMessages([
                'status' => ['The selected status is invalid.'],
            ]),
        };
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function approve(User $actor, EventBooking $booking, array $input): EventBooking
    {
        $this->assertPending($booking);
        $this->assertKnownStage($booking);
        $this->assertCanDecide($actor, $booking);
        $this->assertStageNotDecided($booking);

        $remarks = $this->nullableText($input['approval_remarks'] ?? null);
        $stage = $booking->approval_stage;
        $nextStage = ApprovalStage::nextEventStage($stage);

        $this->recordDecision(
            $booking,
            $actor,
            $stage,
            EventBookingApproval::ACTION_APPROVED,
            $remarks,
        );

        if ($nextStage === null || ApprovalStage::isFinalEventStage($stage)) {
            $booking->update([
                'status' => 'approved',
                'approval_stage' => $stage,
                'approval_remarks' => $remarks ?? $booking->approval_remarks,
            ]);

            return $booking;
        }

        $booking->update([
            'status' => 'pending',
            'approval_stage' => $nextStage,
            'approval_remarks' => $remarks ?? $booking->approval_remarks,
        ]);

        return $booking;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function reject(User $actor, EventBooking $booking, array $input): EventBooking
    {
        $this->assertPending($booking);
        $this->assertKnownStage($booking);
        $this->assertCanDecide($actor, $booking);
        $this->assertStageNotDecided($booking);

        $remarks = $this->requiredText(
            $input['approval_remarks'] ?? null,
            'approval_remarks',
            'A rejection remark is required.',
        );

        $this->recordDecision(
            $booking,
            $actor,
            $booking->approval_stage,
            EventBookingApproval::ACTION_REJECTED,
            $remarks,
        );

        $booking->update([
            'status' => 'rejected',
            'approval_remarks' => $remarks,
        ]);

        return $booking;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function cancel(User $actor, EventBooking $booking, array $input): EventBooking
    {
        $allowed = ['pending', 'approved'];

        if (!in_array($booking->status, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => [
                    "A {$booking->status} booking cannot be changed to cancelled.",
                ],
            ]);
        }

        $this->assertCanCancel($actor, $booking);

        $reason = $this->requiredText(
            $input['cancellation_reason'] ?? null,
            'cancellation_reason',
            'A cancellation reason is required.',
        );

        $booking->update([
            'status' => 'cancelled',
            'cancellation_reason' => $reason,
        ]);

        return $booking;
    }

    private function assertPending(EventBooking $booking): void
    {
        if ($booking->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => [
                    "A {$booking->status} booking cannot be approved or rejected.",
                ],
            ]);
        }
    }

    private function assertKnownStage(EventBooking $booking): void
    {
        if (!ApprovalStage::isEventStage((string) $booking->approval_stage)) {
            throw ValidationException::withMessages([
                'approval_stage' => ['This booking is not in a valid event approval stage.'],
            ]);
        }
    }

    private function assertStageNotDecided(EventBooking $booking): void
    {
        $exists = EventBookingApproval::query()
            ->where('event_booking_id', $booking->event_booking_id)
            ->where('approval_stage', $booking->approval_stage)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'status' => ['This approval stage has already been decided.'],
            ]);
        }
    }

    private function assertCanDecide(User $actor, EventBooking $booking): void
    {
        // Emergency bypass must not skip or fast-forward the event pipeline.
        $allowed = $actor->allows(
            Permission::EVENT_APPROVALS_APPROVE,
            $this->decisionContext($booking),
        );

        if (!$allowed) {
            throw new HttpException(403, 'This action is unauthorized.');
        }
    }

    private function assertCanCancel(User $actor, EventBooking $booking): void
    {
        $allowed = $actor->allows(
            Permission::EVENT_BOOKINGS_EDIT,
            PermissionContext::from(['resource' => $booking]),
        );

        if (!$allowed) {
            throw new HttpException(403, 'This action is unauthorized.');
        }
    }

    private function decisionContext(EventBooking $booking): PermissionContext
    {
        return PermissionContext::from([
            'resource' => $booking,
            'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
            'approval_stage' => $booking->approval_stage,
            'emergency_bypass' => false,
        ]);
    }

    private function recordDecision(
        EventBooking $booking,
        User $actor,
        string $stage,
        string $action,
        ?string $remarks,
    ): void {
        EventBookingApproval::create([
            'event_booking_id' => $booking->event_booking_id,
            'approver_user_id' => $actor->user_id,
            'approval_stage' => $stage,
            'action' => $action,
            'remarks' => $remarks,
        ]);
    }

    private function requiredText(mixed $value, string $field, string $message): string
    {
        $text = $this->nullableText($value);

        if ($text === null) {
            throw ValidationException::withMessages([
                $field => [$message],
            ]);
        }

        return $text;
    }

    private function nullableText(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $text = trim($value);

        return $text === '' ? null : $text;
    }
}
