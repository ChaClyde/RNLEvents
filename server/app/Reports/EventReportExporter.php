<?php

namespace App\Reports;

use App\Models\User;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EventReportExporter
{
    public function __construct(private readonly EventReportService $reports)
    {
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function pdf(User $user, array $filters): Response
    {
        $payload = $this->reports->exportPayload($user, $filters);

        return ReportExportSupport::pdf(
            'reports.pdf.event',
            $payload,
            ReportExportSupport::filename('Event', 'pdf')
        );
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function excel(User $user, array $filters): BinaryFileResponse
    {
        $payload = $this->reports->exportPayload($user, $filters);

        $bookingRows = array_map(fn (array $row) => [
            $row['event_booking_id'],
            $row['purpose'],
            $row['requested_by'],
            $row['office'],
            $row['venue'],
            $row['date_start'],
            $row['date_end'],
            ucfirst((string) $row['status']),
            $row['approval_stage'],
        ], $payload['bookings']);

        $venueRows = array_map(fn (array $row) => [$row['label'], $row['value']], $payload['venues_most']);
        $officeRows = array_map(fn (array $row) => [
            $row['office_name'],
            $row['total'],
            $row['pending'],
            $row['approved'],
            $row['rejected'],
            $row['cancelled'],
        ], $payload['offices']);

        return ReportExportSupport::excel($payload, [
            [
                'name' => 'Event Bookings',
                'headers' => ['ID', 'Purpose', 'Requested by', 'Office', 'Venue', 'Start date', 'End date', 'Status', 'Approval stage'],
                'rows' => $bookingRows,
                'widths' => [10, 36, 22, 24, 22, 14, 14, 14, 18],
            ],
            [
                'name' => 'Venue Utilization',
                'headers' => ['Venue', 'Bookings'],
                'rows' => $venueRows,
                'widths' => [36, 14],
            ],
            [
                'name' => 'Office-Based Reports',
                'headers' => ['Office', 'Total', 'Pending', 'Approved', 'Rejected', 'Cancelled'],
                'rows' => $officeRows,
                'widths' => [32, 12, 12, 12, 12, 12],
            ],
        ], ReportExportSupport::filename('Event', 'xlsx'));
    }
}
