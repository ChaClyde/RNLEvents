<?php

namespace App\EventBookings;

use App\Models\EventBooking;
use App\Models\EventBookingApproval;
use App\Models\User;
use App\Permissions\ApprovalStage;
use App\Permissions\Permission;
use App\Permissions\PermissionContext;
use App\Notifications\SystemNotifier;
use App\Signatures\SignatureStorage;
use Illuminate\Support\Facades\DB;
use Throwable;
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
            $input['decision_slot'],
            $input['emergency_bypass'],
        );

        return DB::transaction(function () use ($actor, $booking, $action, $input) {
            // Lock the row so two simultaneous decisions can't both pass the checks.
            $booking = EventBooking::query()
                ->whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            return match ($action) {
                EventBookingApproval::ACTION_APPROVED => $this->approve($actor, $booking, $input),
                EventBookingApproval::ACTION_REJECTED => $this->reject($actor, $booking, $input),
                'cancelled' => $this->cancel($actor, $booking, $input),
                default => throw ValidationException::withMessages([
                    'status' => ['The selected status is invalid.'],
                ]),
            };
        });
    }

    private function approve(User $actor, EventBooking $booking, array $input): EventBooking
    {
        $this->assertPending($booking);
        $this->assertKnownStage($booking);
        $this->assertCanDecide($actor, $booking);

        $remarks = $this->nullableText($input['approval_remarks'] ?? null);
        $stage = $booking->approval_stage;
        $slot = null;
        $this->assertTurnAvailable($booking);
        $this->assertCalculationConfirmed($booking, $stage);
        $snapshot = SignatureStorage::copyForApproval($actor);

        try {
            $this->recordDecision(
                $booking,
                $actor,
                $stage,
                EventBookingApproval::ACTION_APPROVED,
                $remarks,
                $snapshot,
                $slot,
            );

            $nextStage = ApprovalStage::nextEventStage($stage);

            if ($nextStage === null || ApprovalStage::isFinalEventStage($stage)) {
                $booking->update([
                    'status' => 'approved',
                    'approval_stage' => $stage,
                    'approval_remarks' => $remarks ?? $booking->approval_remarks,
                ]);

                $approved = $booking->fresh();
                app(ApprovedEventRecorder::class)->record($approved);
                app(SystemNotifier::class)->bookingDecided($approved, $actor);

                return $approved;
            }

            $booking->update([
                'status' => 'pending',
                'approval_stage' => $nextStage,
                'approval_remarks' => $remarks ?? $booking->approval_remarks,
            ]);

            app(SystemNotifier::class)->bookingDecided($booking, $actor);

            return $booking;
        } catch (Throwable $exception) {
            SignatureStorage::deleteApprovalFile($snapshot['signature_path']);
            throw $exception;
        }
    }

    private function reject(User $actor, EventBooking $booking, array $input): EventBooking
    {
        $this->assertPending($booking);
        $this->assertKnownStage($booking);
        $this->assertCanDecide($actor, $booking);

        $remarks = $this->requiredText(
            $input['approval_remarks'] ?? null,
            'approval_remarks',
            'A rejection remark is required.',
        );
        $slot = null;
        $this->assertTurnAvailable($booking);

        $this->recordDecision(
            $booking,
            $actor,
            $booking->approval_stage,
            EventBookingApproval::ACTION_REJECTED,
            $remarks,
            null,
            $slot,
        );

        $booking->update([
            'status' => 'rejected',
            'approval_remarks' => $remarks,
        ]);

        app(SystemNotifier::class)->bookingDecided($booking, $actor);

        return $booking;
    }

    private function cancel(User $actor, EventBooking $booking, array $input): EventBooking
    {
        if (!in_array($booking->status, ['pending', 'approved'], true)) {
            throw ValidationException::withMessages([
                'status' => ["A {$booking->status} booking cannot be changed to cancelled."],
            ]);
        }

        $this->assertCanCancel($actor, $booking);
        $wasApproved = $booking->status === 'approved';

        $reason = $this->requiredText(
            $input['cancellation_reason'] ?? null,
            'cancellation_reason',
            'A cancellation reason is required.',
        );

        $booking->update([
            'status' => 'cancelled',
            'cancellation_reason' => $reason,
        ]);

        if ($wasApproved) {
            app(ApprovedEventRecorder::class)->withdraw($booking);
        }

        app(SystemNotifier::class)->bookingDecided($booking, $actor);

        return $booking;
    }

    private function assertPending(EventBooking $booking): void
    {
        if ($booking->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ["A {$booking->status} booking cannot be approved or rejected."],
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

    private function assertCalculationConfirmed(EventBooking $booking, string $stage): void
    {
        if ($stage !== ApprovalStage::EVENT_APPROVAL) {
            return;
        }

        $snapshot = $booking->feeSnapshot()->first();

        if ($snapshot !== null && $snapshot->calculation_confirmed_at === null) {
            throw ValidationException::withMessages([
                'status' => ['Confirm the venue calculation before approving this booking.'],
            ]);
        }
    }

    private function assertTurnAvailable(EventBooking $booking): void
    {
        $existing = EventBookingApproval::query()
            ->where('event_booking_id', $booking->event_booking_id)
            ->where('approval_stage', $booking->approval_stage)
            ->lockForUpdate()
            ->get();

        if ($existing->isNotEmpty()) {
            throw ValidationException::withMessages([
                'status' => ['This approval stage has already been decided.'],
            ]);
        }
    }

    private function assertCanDecide(User $actor, EventBooking $booking): void
    {
        // Nobody approves their own request.
        if ((int) $booking->requested_by_user_id === (int) $actor->user_id) {
            throw new HttpException(403, 'You cannot approve your own request.');
        }

        // Step 1 (dean / office head) is limited to the booking's own office.
        if ($booking->approval_stage === ApprovalStage::OFFICE_HEAD
            && (int) $booking->office_id !== (int) $actor->office_id) {
            throw new HttpException(403, 'This action is unauthorized.');
        }

        // Role-to-stage rules live in the permission catalog/checker.
        $allowed = $actor->allows(
            Permission::EVENT_APPROVALS_APPROVE,
            PermissionContext::from([
                'resource' => $booking,
                'approval_pipeline' => ApprovalStage::PIPELINE_EVENT,
                'approval_stage' => $booking->approval_stage,
                'emergency_bypass' => false,
            ]),
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

    /**
     * @param  array{signature_path: string, signature_mime: string, signer_name: string, signer_position: ?string}|null  $snapshot
     */
    private function recordDecision(
        EventBooking $booking,
        User $actor,
        string $stage,
        string $action,
        ?string $remarks,
        ?array $snapshot = null,
        ?string $slot = null,
    ): void {
        EventBookingApproval::create([
            'event_booking_id' => $booking->event_booking_id,
            'approver_user_id' => $actor->user_id,
            'approval_stage' => $stage,
            'decision_slot' => $slot,
            'action' => $action,
            'remarks' => $remarks,
            'signature_path' => $snapshot['signature_path'] ?? null,
            'signature_mime' => $snapshot['signature_mime'] ?? null,
            'signer_name' => $snapshot['signer_name'] ?? null,
            'signer_position' => $snapshot['signer_position'] ?? null,
        ]);
    }

    private function requiredText(mixed $value, string $field, string $message): string
    {
        $text = $this->nullableText($value);

        if ($text === null) {
            throw ValidationException::withMessages([$field => [$message]]);
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