<?php

namespace App\EventBookings;

use App\Models\EventBooking;
use App\Models\EventBookingApproval;
use App\Permissions\ApprovalStage;
use App\Scheduling\GymUsagePolicy;
use App\Scheduling\TimeFormat;
use App\Signatures\SignatureStorage;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

final class EventBookingSlip
{
    /**
     * @return array<string, mixed>
     */
    public static function data(EventBooking $booking): array
    {
        $booking->loadMissing([
            'feeSnapshot.lines',
            'venue:venue_id,venue,location,capacity',
            'office:office_id,office_name,office_code',
            'resources',
            'schedules',
            'approvals.approver',
            'universityWideDesignator:user_id,first_name,last_name',
            'attachments:attachment_id,event_booking_id,original_filename,mime_type,file_size,attachment_type,uploaded_by,created_at',
        ]);

        $stages = [];

        foreach (ApprovalStage::eventPipeline() as $stage) {
            if ($stage === ApprovalStage::EVENT_APPROVAL && self::usesFinancialSlots($booking)) {
                $businessManagerApproved = $booking->approvals->contains(
                    fn (EventBookingApproval $row) => $row->approval_stage === $stage
                        && $row->decision_slot === EventBookingApproval::SLOT_BUSINESS_MANAGER
                        && $row->action === EventBookingApproval::ACTION_APPROVED
                );

                foreach ([
                    EventBookingApproval::SLOT_BUSINESS_MANAGER => 'Business Manager',
                    EventBookingApproval::SLOT_VP_FINANCE => 'VP-Finance',
                ] as $slot => $label) {
                    $decision = $booking->approvals->first(
                        fn (EventBookingApproval $row) => $row->approval_stage === $stage
                            && $row->decision_slot === $slot
                    );
                    $waiting = $slot === EventBookingApproval::SLOT_BUSINESS_MANAGER || $businessManagerApproved;
                    $stages[] = self::stageRow($booking, $stage, $label, $decision, $waiting);
                }

                continue;
            }

            $decision = $booking->approvals->first(
                fn (EventBookingApproval $row) => $row->approval_stage === $stage && $row->decision_slot === null
            );
            $stages[] = self::stageRow($booking, $stage, self::stageLabel($stage), $decision);
        }

        $schedules = $booking->schedules->map(fn ($row) => [
            'date' => $row->schedule_date?->format('M j, Y') ?? 'Date not recorded',
            'time' => trim(
                (TimeFormat::label($row->time_start) ?? 'Not recorded')
                .' – '
                .(TimeFormat::label($row->time_end) ?? 'Not recorded')
            ),
        ])->values()->all();

        if ($schedules === []) {
            $schedules[] = [
                'date' => self::dateSpan($booking),
                'time' => trim(
                    (TimeFormat::label($booking->time_start) ?? 'Not recorded')
                    .' – '
                    .(TimeFormat::label($booking->time_end) ?? 'Not recorded')
                ),
            ];
        }

        return [
            'organization' => 'Filamer Christian University Inc.',
            'title' => 'Event Booking Slip',
            'booking_id' => $booking->event_booking_id,
            'generated_at' => now()->format('M j, Y g:i A'),
            'status' => ucfirst((string) $booking->status),
            'approved_at' => self::approvedAt($booking),
            'current_stage' => self::stageLabel((string) $booking->approval_stage),
            'purpose' => $booking->purpose,
            'description' => self::text($booking->description),
            'requested_by' => self::text($booking->requested_by),
            'requester_signer_name' => self::text($booking->requester_signer_name),
            'requester_signer_position' => self::text($booking->requester_signer_position),
            'requester_signature_uri' => SignatureStorage::fileDataUri(
                SignatureStorage::APPROVAL_DISK,
                $booking->requester_signature_path,
                $booking->requester_signature_mime,
            ),
            'office' => $booking->office
                ? trim($booking->office->office_name.' ('.$booking->office->office_code.')')
                : null,
            'email' => self::text($booking->email),
            'telephone' => self::text($booking->tel_number),
            'venue' => $booking->venue?->venue,
            'gym' => self::gym($booking),
            'location' => $booking->venue?->location,
            'capacity' => $booking->venue?->capacity,
            'expected_attendees' => $booking->expected_attendees,
            'schedule_type' => ucfirst((string) ($booking->schedule_type ?: 'range')),
            'schedules' => $schedules,
            'resources' => $booking->resources->map(fn ($row) => [
                'name' => $row->resource_name,
                'quantity' => $row->quantity,
                'notes' => $row->notes,
            ])->values()->all(),
            'letters' => $booking->attachments
                ->map(fn ($row) => $row->original_filename)
                ->filter()
                ->values()
                ->all(),
            'approval_remarks' => self::text($booking->approval_remarks),
            'cancellation_reason' => self::text($booking->cancellation_reason),
            'fees' => self::fees($booking),
            'financial_slots' => self::usesFinancialSlots($booking),
            'stages' => $stages,
        ];
    }

    public static function response(EventBooking $booking, string $disposition): Response
    {
        $pdf = Pdf::loadView('event-bookings.slip', [
            'slip' => self::data($booking),
        ])
            ->setPaper('a4', 'portrait')
            ->setOption('isRemoteEnabled', false)
            ->setOption('isPhpEnabled', false)
            ->setOption('defaultFont', 'DejaVu Sans');

        $filename = 'FCU-Event-Booking-Slip-'.$booking->event_booking_id.'.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * @return array{recorded: bool, note: string|null, lines: list<array<string, mixed>>, total: string|null}
     */
    private static function fees(EventBooking $booking): array
    {
        $snapshot = $booking->feeSnapshot;

        if ($snapshot === null) {
            return [
                'recorded' => false,
                'note' => 'No fee breakdown is recorded on this booking.',
                'groups' => [],
                'lines' => [],
                'total' => null,
            ];
        }

        $lines = $snapshot->lines->map(fn ($line) => [
            'date' => $line->schedule_date?->format('M j, Y'),
            'line_type' => $line->line_type,
            'category' => self::feeCategory($line->line_type),
            'label' => $line->label,
            'quantity' => $line->quantity,
            'unit' => $line->unit,
            'unit_amount' => $line->unit_amount,
            'amount' => $line->line_amount,
        ])->values()->all();

        return [
            'recorded' => true,
            'note' => $snapshot->calculation_note,
            'total' => $snapshot->total_amount,
            'groups' => self::feeGroups($lines),
            'lines' => $lines,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $lines
     * @return list<array{category: string, amount: string}>
     */
    private static function feeGroups(array $lines): array
    {
        $order = ['venue', 'overtime', 'facility', 'equipment', 'service', 'additional'];
        $totals = [];

        foreach ($lines as $line) {
            $type = in_array($line['line_type'], $order, true) ? $line['line_type'] : 'additional';
            $totals[$type] = ($totals[$type] ?? 0) + (int) round(((float) $line['amount']) * 100);
        }

        $groups = [];

        foreach ($order as $type) {
            if (!array_key_exists($type, $totals)) {
                continue;
            }

            $groups[] = [
                'category' => self::feeCategory($type),
                'amount' => number_format($totals[$type] / 100, 2, '.', ''),
            ];
        }

        return $groups;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function gym(EventBooking $booking): ?array
    {
        if ($booking->venue === null || !app(GymUsagePolicy::class)->appliesTo($booking->venue)) {
            return null;
        }

        $span = match ($booking->reservation_span) {
            'whole_semester' => 'Whole semester',
            'whole_summer' => 'Whole summer',
            default => 'Not recorded as a whole-semester or whole-summer reservation',
        };

        return [
            'acknowledged' => (bool) $booking->gym_responsibilities_acknowledged,
            'acknowledgment' => $booking->gym_responsibilities_acknowledged
                ? 'Acknowledged'
                : 'Not acknowledged',
            'statement' => $booking->gym_responsibility_statement,
            'university_wide' => (bool) $booking->university_wide_activity,
            'designated_by' => $booking->university_wide_activity
                ? ($booking->universityWideDesignator?->full_name ?: 'Authorized person not recorded')
                : null,
            'designated_at' => $booking->university_wide_activity
                ? $booking->university_wide_designated_at?->format('M j, Y g:i A')
                : null,
            'reservation_span' => $span,
        ];
    }

    private static function feeCategory(?string $lineType): string
    {
        return match ($lineType) {
            'venue' => 'Base facility rental',
            'overtime' => 'Overtime',
            'facility' => 'Additional facility charge',
            'equipment' => 'Equipment charge',
            'service' => 'Additional service charge',
            default => 'Additional charge',
        };
    }

    private static function usesFinancialSlots(EventBooking $booking): bool
    {
        $rows = $booking->approvals->where('approval_stage', ApprovalStage::EVENT_APPROVAL);

        return $rows->contains(fn (EventBookingApproval $row) => filled($row->decision_slot));
    }

    /**
     * @return array<string, mixed>
     */
    private static function stageRow(
        EventBooking $booking,
        string $stage,
        string $label,
        ?EventBookingApproval $decision,
        bool $waiting = true,
    ): array {
        $approver = $decision?->approver;

        return [
            'key' => $stage,
            'label' => $label,
            'state' => self::stageState($booking, $stage, $decision, $waiting),
            'action' => $decision?->action,
            'approver' => $decision?->signer_name ?: $approver?->full_name,
            'position' => $decision?->signer_position,
            'remarks' => $decision?->remarks,
            'decided_at' => $decision?->created_at?->format('M j, Y g:i A'),
            'signature_uri' => $decision ? SignatureStorage::approvalDataUri($decision) : null,
        ];
    }

    private static function stageState(
        EventBooking $booking,
        string $stage,
        ?EventBookingApproval $decision,
        bool $waiting = true,
    ): string {
        if ($decision) {
            return $decision->action === EventBookingApproval::ACTION_APPROVED
                ? 'Approved'
                : 'Rejected';
        }

        if ($waiting && $booking->status === 'pending' && $booking->approval_stage === $stage) {
            return 'Awaiting decision';
        }

        return 'Not yet reviewed';
    }

    private static function approvedAt(EventBooking $booking): ?string
    {
        if ($booking->status !== 'approved') {
            return null;
        }

        $decision = $booking->approvals
            ->filter(fn (EventBookingApproval $row) => $row->approval_stage === ApprovalStage::SUPER_ADMIN
                && $row->decision_slot === null
                && $row->action === EventBookingApproval::ACTION_APPROVED)
            ->sortByDesc(fn (EventBookingApproval $row) => $row->created_at)
            ->first();

        return $decision?->created_at?->format('M j, Y g:i A');
    }

    private static function stageLabel(string $stage): string
    {
        return match ($stage) {
            ApprovalStage::OFFICE_HEAD => 'Office Head',
            ApprovalStage::EVENT_ADMIN => 'Event Admin',
            ApprovalStage::EVENT_APPROVAL => 'Event Approval Admin',
            ApprovalStage::SUPER_ADMIN => 'Super Admin',
            default => $stage,
        };
    }

    private static function dateSpan(EventBooking $booking): string
    {
        $start = $booking->date_start?->format('M j, Y');
        $end = $booking->date_end?->format('M j, Y');

        if ($start && $end && $start !== $end) {
            return $start.' – '.$end;
        }

        return $start ?: 'Date not recorded';
    }

    private static function text(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }
}
