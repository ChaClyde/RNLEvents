<?php

namespace App\Reports;

use App\Models\User;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class VehicleReportExporter
{
    public function __construct(private readonly VehicleReportService $reports)
    {
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function pdf(User $user, array $filters): Response
    {
        $payload = $this->reports->exportPayload($user, $filters);

        return ReportExportSupport::pdf(
            'reports.pdf.vehicle',
            $payload,
            ReportExportSupport::filename('Vehicle', 'pdf')
        );
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function excel(User $user, array $filters): BinaryFileResponse
    {
        $payload = $this->reports->exportPayload($user, $filters);
        $utilization = $payload['utilization'];
        $drivers = $payload['drivers'];

        $bookingRows = array_map(fn (array $row) => [
            $row['vehicle_booking_id'],
            $row['requested_by'],
            $row['office'],
            $row['destination'],
            $row['purpose'],
            $row['vehicle'],
            $row['plate_number'],
            $row['driver'],
            $row['travel_date'],
            $row['departure_time'],
            $row['expected_return_date'],
            $row['expected_return_time'],
            $row['passenger_count'],
            ucfirst((string) $row['status']),
            $row['approval_stage'],
        ], $payload['bookings']);

        $vehicleRows = array_map(fn (array $row) => [$row['label'], $row['value']], $utilization['trips_per_vehicle'] ?? []);
        $driverAssignmentRows = array_map(fn (array $row) => [$row['label'], $row['value']], $drivers['assignments'] ?? []);
        $leaveRows = array_map(fn (array $row) => [
            $row['driver_name'],
            $row['status'],
            $row['status_remarks'],
            $row['status_start_date'],
            $row['status_end_date'],
        ], $drivers['leave'] ?? []);
        $licenseRows = array_map(fn (array $row) => [
            $row['driver_name'],
            $row['license_expiry'],
            !empty($row['expired']) ? 'Expired' : 'Expiring',
        ], $drivers['licenses'] ?? []);
        $officeRows = array_map(fn (array $row) => [
            $row['office_name'],
            $row['total'],
            $row['pending'],
            $row['approved'],
            $row['rejected'],
            $row['cancelled'],
        ], $payload['offices']);

        $sheets = [
            [
                'name' => 'Vehicle Bookings',
                'headers' => [
                    'ID', 'Requested by', 'Office', 'Destination', 'Purpose', 'Vehicle', 'Plate', 'Driver',
                    'Travel date', 'Departure', 'Return date', 'Return time', 'Passengers', 'Status', 'Approval stage',
                ],
                'rows' => $bookingRows,
                'widths' => [10, 20, 22, 20, 28, 18, 12, 18, 14, 12, 14, 12, 12, 12, 16],
            ],
            [
                'name' => 'Vehicle Utilization',
                'headers' => ['Vehicle', 'Trips'],
                'rows' => $vehicleRows,
                'widths' => [36, 12],
            ],
            [
                'name' => 'Driver Reports',
                'headers' => ['Driver', 'Assigned trips'],
                'rows' => $driverAssignmentRows,
                'widths' => [32, 16],
            ],
            [
                'name' => 'Office-Based Reports',
                'headers' => ['Office', 'Total', 'Pending', 'Approved', 'Rejected', 'Cancelled'],
                'rows' => $officeRows,
                'widths' => [32, 12, 12, 12, 12, 12],
            ],
        ];

        if (!empty($drivers['can_view_drivers'])) {
            $sheets[] = [
                'name' => 'Driver Leave',
                'headers' => ['Driver', 'Status', 'Remarks', 'Start date', 'End date'],
                'rows' => $leaveRows,
                'widths' => [28, 16, 28, 14, 14],
            ];
            $sheets[] = [
                'name' => 'License Alerts',
                'headers' => ['Driver', 'License expiry', 'State'],
                'rows' => $licenseRows,
                'widths' => [28, 16, 14],
            ];
        }

        return ReportExportSupport::excel(
            $payload,
            $sheets,
            ReportExportSupport::filename('Vehicle', 'xlsx')
        );
    }
}
