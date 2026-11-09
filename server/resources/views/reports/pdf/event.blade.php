@extends('reports.pdf.layout')

@section('content')
    <h2>Office-based reports</h2>
    <table class="data">
        <thead>
            <tr>
                <th>Office</th>
                <th>Total</th>
                <th>Pending</th>
                <th>Approved</th>
                <th>Rejected</th>
                <th>Cancelled</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($report['offices'] as $office)
                <tr>
                    <td>{{ $office['office_name'] }}</td>
                    <td>{{ $office['total'] }}</td>
                    <td>{{ $office['pending'] }}</td>
                    <td>{{ $office['approved'] }}</td>
                    <td>{{ $office['rejected'] }}</td>
                    <td>{{ $office['cancelled'] }}</td>
                </tr>
            @empty
                <tr><td colspan="6">No office totals for the selected filters.</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>Venue utilization</h2>
    <table class="data">
        <thead>
            <tr><th>Venue</th><th>Bookings</th></tr>
        </thead>
        <tbody>
            @forelse ($report['venues_most'] as $venue)
                <tr>
                    <td>{{ $venue['label'] }}</td>
                    <td>{{ $venue['value'] }}</td>
                </tr>
            @empty
                <tr><td colspan="2">No venue activity for the selected filters.</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>Event bookings</h2>
    <table class="data">
        <thead>
            <tr>
                <th>ID</th>
                <th>Purpose</th>
                <th>Requested by</th>
                <th>Office</th>
                <th>Venue</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Stage</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($report['bookings'] as $row)
                <tr>
                    <td>{{ $row['event_booking_id'] }}</td>
                    <td>{{ $row['purpose'] }}</td>
                    <td>{{ $row['requested_by'] }}</td>
                    <td>{{ $row['office'] }}</td>
                    <td>{{ $row['venue'] }}</td>
                    <td>{{ $row['date_start'] }}</td>
                    <td>{{ $row['date_end'] }}</td>
                    <td>{{ ucfirst($row['status']) }}</td>
                    <td>{{ $row['approval_stage'] }}</td>
                </tr>
            @empty
                <tr><td colspan="9">No matching event bookings.</td></tr>
            @endforelse
        </tbody>
    </table>
@endsection
