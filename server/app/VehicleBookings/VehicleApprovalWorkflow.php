<?php

namespace App\VehicleBookings;

use App\Models\User;
use App\Models\VehicleBooking;
use App\Models\VehicleBookingApproval;
use App\Permissions\ApprovalStage;
use App\Permissions\Permission;
use App\Permissions\PermissionContext;
use App\Notifications\SystemNotifier;
use App\Signatures\SignatureStorage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VehicleApprovalWorkflow
{
    public function __construct(private readonly VehicleAssignmentService $assignments)
    {
    }

    /**
     * @param  array{approval_remarks?: mixed, cancellation_reason?: mixed}  $input
     */
    public function apply(User $actor, VehicleBooking $booking, string $action, array $input): VehicleBooking
    {
        unset(
            $input['approval_stage'],
            $input['approved_by'],
            $input['approved_by_user_id'],
            $input['approver_user_id'],
            $input['approver_id'],
            $input['emergency_bypass'],
            $input['vehicle_id'],
            $input['driver_id'],
        );

        return match ($action) {
            VehicleBookingApproval::ACTION_APPROVED => $this->approve($actor, $booking, $input),
            VehicleBookingApproval::ACTION_REJECTED => $this->reject($actor, $booking, $input),
            'cancelled' => $this->cancel($actor, $booking, $input),
            default => throw ValidationException::withMessages([
                'status' => ['The selected status is invalid.'],
            ]),
        };
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function approve(User $actor, VehicleBooking $booking, array $input): VehicleBooking
    {
        $this->assertPending($booking);
        $this->assertKnownStage($booking);
        $this->assertCanDecide($actor, $booking);
        $this->assertStageNotDecided($booking);
        $this->assertCalculationConfirmed($booking);
        $this->assignments->assertReadyForAdvancement($actor, $booking);

        $remarks = $this->nullableText($input['approval_remarks'] ?? null);
        $stage = $booking->approval_stage;
        $nextStage = ApprovalStage::nextVehicleStage($stage);
        $snapshot = SignatureStorage::copyForApproval($actor);

        try {
            $this->recordDecision(
                $booking,
                $actor,
                $stage,
                VehicleBookingApproval::ACTION_APPROVED,
                $remarks,
                $snapshot,
            );
        } catch (\Throwable $exception) {
            SignatureStorage::deleteApprovalFile($snapshot['signature_path']);
            throw $exception;
        }

        if ($nextStage === null || ApprovalStage::isFinalVehicleStage($stage)) {
            $booking->update([
                'status' => 'approved',
                'approval_stage' => $stage,
                'approval_remarks' => $remarks ?? $booking->approval_remarks,
            ]);

            app(SystemNotifier::class)->bookingDecided($booking, $actor);

            return $booking;
        }

        $booking->update([
            'status' => 'pending',
            'approval_stage' => $nextStage,
            'approval_remarks' => $remarks ?? $booking->approval_remarks,
        ]);

        app(SystemNotifier::class)->bookingDecided($booking, $actor);

        return $booking;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function reject(User $actor, VehicleBooking $booking, array $input): VehicleBooking
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

        $snapshot = SignatureStorage::copyForApproval($actor);

        try {
            $this->recordDecision(
                $booking,
                $actor,
                $booking->approval_stage,
                VehicleBookingApproval::ACTION_REJECTED,
                $remarks,
                $snapshot,
            );
        } catch (\Throwable $exception) {
            SignatureStorage::deleteApprovalFile($snapshot['signature_path']);
            throw $exception;
        }

        $booking->update([
            'status' => 'rejected',
            'approval_remarks' => $remarks,
        ]);

        app(SystemNotifier::class)->bookingDecided($booking, $actor);

        return $booking;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function cancel(User $actor, VehicleBooking $booking, array $input): VehicleBooking
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

        app(SystemNotifier::class)->bookingDecided($booking, $actor);

        return $booking;
    }

    private function assertPending(VehicleBooking $booking): void
    {
        if ($booking->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => [
                    "A {$booking->status} booking cannot be approved or rejected.",
                ],
            ]);
        }
    }

    private function assertKnownStage(VehicleBooking $booking): void
    {
        if (!ApprovalStage::isVehicleStage((string) $booking->approval_stage)) {
            throw ValidationException::withMessages([
                'approval_stage' => ['This booking is not in a valid vehicle approval stage.'],
            ]);
        }
    }

    private function assertCalculationConfirmed(VehicleBooking $booking): void
    {
        if (!in_array($booking->approval_stage, [ApprovalStage::VEHICLE_ADMIN, ApprovalStage::VEHICLE_APPROVAL], true)) {
            return;
        }

        if ($booking->charge_lines === null) {
            return;
        }

        if ($booking->calculation_confirmed_stage !== $booking->approval_stage) {
            throw ValidationException::withMessages([
                'fee' => ['Confirm the vehicle charge breakdown before approving.'],
            ]);
        }
    }

    private function assertStageNotDecided(VehicleBooking $booking): void
    {
        $exists = VehicleBookingApproval::query()
            ->where('vehicle_booking_id', $booking->vehicle_booking_id)
            ->where('approval_stage', $booking->approval_stage)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'status' => ['This approval stage has already been decided.'],
            ]);
        }
    }

    private function assertCanDecide(User $actor, VehicleBooking $booking): void
    {
        $allowed = $actor->allows(
            Permission::VEHICLE_APPROVALS_APPROVE,
            $this->decisionContext($booking),
        );

        if (!$allowed) {
            throw new HttpException(403, 'This action is unauthorized.');
        }
    }

    private function assertCanCancel(User $actor, VehicleBooking $booking): void
    {
        $allowed = $actor->allows(
            Permission::VEHICLE_BOOKINGS_EDIT,
            PermissionContext::from(['resource' => $booking]),
        );

        if (!$allowed) {
            throw new HttpException(403, 'This action is unauthorized.');
        }
    }

    public function assertCanAssign(User $actor, VehicleBooking $booking): void
    {
        if ($booking->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending vehicle bookings can receive an assignment.'],
            ]);
        }

        if (!ApprovalStage::isVehicleAssignmentStage((string) $booking->approval_stage)) {
            throw new HttpException(403, 'This action is unauthorized.');
        }

        $allowed = $actor->allows(
            Permission::VEHICLE_APPROVALS_APPROVE,
            $this->decisionContext($booking),
        );

        if (!$allowed) {
            throw new HttpException(403, 'This action is unauthorized.');
        }
    }

    private function decisionContext(VehicleBooking $booking): PermissionContext
    {
        return PermissionContext::from([
            'resource' => $booking,
            'approval_pipeline' => ApprovalStage::PIPELINE_VEHICLE,
            'approval_stage' => $booking->approval_stage,
            'emergency_bypass' => false,
        ]);
    }

    private function recordDecision(
        VehicleBooking $booking,
        User $actor,
        string $stage,
        string $action,
        ?string $remarks,
        array $snapshot,
    ): void {
        VehicleBookingApproval::create([
            'vehicle_booking_id' => $booking->vehicle_booking_id,
            'approver_user_id' => $actor->user_id,
            'approval_stage' => $stage,
            'action' => $action,
            'remarks' => $remarks,
            'signature_path' => $snapshot['signature_path'],
            'signature_mime' => $snapshot['signature_mime'],
            'signer_name' => $snapshot['signer_name'],
            'signer_position' => $snapshot['signer_position'],
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
