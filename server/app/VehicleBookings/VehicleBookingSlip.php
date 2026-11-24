<?php

namespace App\VehicleBookings;

use App\Models\VehicleBooking;
use App\Models\VehicleBookingApproval;
use App\Permissions\ApprovalStage;
use App\Signatures\SignatureStorage;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

final class VehicleBookingSlip
{
    public static function response(VehicleBooking $booking, string $disposition): Response
    {
        $pdf = Pdf::loadView('vehicle-bookings.slip', [
            'slip' => self::data($booking),
        ])
            ->setPaper('a4', 'portrait')
            ->setOption('isRemoteEnabled', false)
            ->setOption('isPhpEnabled', false)
            ->setOption('defaultFont', 'DejaVu Sans');

        $filename = 'FCU-Vehicle-Booking-Slip-'.$booking->vehicle_booking_id.'.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function data(VehicleBooking $booking): array
    {
        $booking->loadMissing(['office', 'vehicle', 'driver', 'approvals.approver', 'attachments']);

        $labels = [
            ApprovalStage::OFFICE_HEAD => 'Unit Head (Dean / Office Head)',
            ApprovalStage::VEHICLE_ADMIN => "Admin Assistant, President's Office",
            ApprovalStage::VEHICLE_APPROVAL => 'Admin Approvals',
            ApprovalStage::OIC_BUDGET => 'OIC, Accounting/Budget Office',
            ApprovalStage::SUPER_ADMIN => 'President',
        ];

        $stages = [];
        foreach (ApprovalStage::vehiclePipeline() as $stage) {
            $decision = $booking->approvals->firstWhere('approval_stage', $stage);
            $stages[] = self::stageRow($labels[$stage] ?? $stage, $decision);
        }

        $lines = collect($booking->charge_lines ?? [])->map(function ($line) {
            $quantity = (float) ($line['quantity'] ?? 0);
            $unit = (float) ($line['unit_amount'] ?? 0);

            return [
                'label' => (string) ($line['label'] ?? 'Charge'),
                'rows' => VehicleUseSchedule::presentLine($line),
                'detail' => implode(' ', VehicleUseSchedule::presentLine($line)),
                'quantity' => number_format($quantity, 2),
                'unit_amount' => number_format($unit, 2),
                'amount' => number_format(round($quantity * $unit, 2), 2),
            ];
        })->values()->all();

        $vehicle = $booking->vehicle;
        $vehicleLabel = $vehicle
            ? trim($vehicle->vehicle_name.($vehicle->plate_number ? ' · '.$vehicle->plate_number : ''))
            : 'Not assigned';

        return [
            'organization' => 'Filamer Christian University Inc.',
            'title' => 'Permission for the Use of Vehicle',
            'booking_id' => $booking->vehicle_booking_id,
            'generated_at' => now()->format('M j, Y g:i A'),
            'status' => ucfirst((string) $booking->status),
            'current_stage' => $labels[$booking->approval_stage] ?? (string) $booking->approval_stage,
            'requested_by' => $booking->requested_by,
            'requester_signer_name' => $booking->requester_signer_name,
            'requester_signer_position' => $booking->requester_signer_position,
            'requester_signature_uri' => SignatureStorage::fileDataUri(
                SignatureStorage::APPROVAL_DISK,
                $booking->requester_signature_path,
                $booking->requester_signature_mime,
            ),
            'office' => $booking->office->office_name ?? null,
            'email' => $booking->email,
            'telephone' => $booking->tel_number,
            'destination' => $booking->destination,
            'purpose' => $booking->purpose,
            'remarks' => $booking->remarks,
            'travel' => trim(
                ($booking->travel_date?->format('M j, Y') ?? '')
                .' '.substr((string) $booking->departure_time, 0, 5)
                .' to '
                .($booking->expected_return_date?->format('M j, Y') ?? '')
                .' '.substr((string) $booking->expected_return_time, 0, 5)
            ),
            'passengers' => $booking->passenger_count,
            'passenger_details' => $booking->passenger_details,
            'vehicle' => $vehicleLabel,
            'driver' => $booking->driver->driver_name ?? 'Not assigned',
            'seating' => VehicleUseSchedule::seatingNote($vehicle?->vehicle_name),
            'charges' => $lines,
            'charge_total' => $booking->charge_total !== null
                ? number_format((float) $booking->charge_total, 2)
                : null,
            'letters' => $booking->attachments->pluck('original_filename')->filter()->values()->all(),
            'stages' => $stages,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function stageRow(string $label, ?VehicleBookingApproval $decision): array
    {
        return [
            'label' => $label,
            'action' => $decision?->action ? ucfirst((string) $decision->action) : 'Waiting',
            'name' => $decision?->signer_name ?: $decision?->approver?->full_name,
            'position' => $decision?->signer_position,
            'remarks' => $decision?->remarks,
            'decided_at' => $decision?->created_at?->format('M j, Y g:i A'),
            'signature_uri' => $decision
                ? SignatureStorage::fileDataUri(
                    SignatureStorage::APPROVAL_DISK,
                    $decision->signature_path,
                    $decision->signature_mime,
                )
                : null,
        ];
    }
}
