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

    <h2>Vehicle utilization</h2>
    @if (!empty($report['utilization']['can_view_fleet']))
        <p class="muted">
            Fleet inventory: {{ $report['utilization']['fleet']['total'] }} vehicles
            ({{ $report['utilization']['fleet']['available'] }} available,
            {{ $report['utilization']['fleet']['unavailable'] }} unavailable,
            {{ $report['utilization']['fleet']['maintenance'] }} maintenance).
        </p>
    @endif
    <table class="data">
        <thead>
            <tr><th>Vehicle</th><th>Trips</th></tr>
        </thead>
        <tbody>
            @forelse ($report['utilization']['trips_per_vehicle'] as $row)
                <tr>
                    <td>{{ $row['label'] }}</td>
                    <td>{{ $row['value'] }}</td>
                </tr>
            @empty
                <tr><td colspan="2">No vehicle trips for the selected filters.</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>Driver reports</h2>
    <table class="data">
        <thead>
            <tr><th>Driver</th><th>Assigned trips</th></tr>
        </thead>
        <tbody>
            @forelse ($report['drivers']['assignments'] as $row)
                <tr>
                    <td>{{ $row['label'] }}</td>
                    <td>{{ $row['value'] }}</td>
                </tr>
            @empty
                <tr><td colspan="2">No driver assignments for the selected filters.</td></tr>
            @endforelse
        </tbody>
    </table>

    @if (!empty($report['drivers']['can_view_drivers']))
        <h2>Driver leave</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Start</th>
                    <th>End</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($report['drivers']['leave'] as $row)
                    <tr>
                        <td>{{ $row['driver_name'] }}</td>
                        <td>{{ $row['status'] }}</td>
                        <td>{{ $row['status_remarks'] }}</td>
                        <td>{{ $row['status_start_date'] }}</td>
                        <td>{{ $row['status_end_date'] }}</td>
                    </tr>
                @empty
                    <tr><td colspan="5">No drivers currently on leave.</td></tr>
                @endforelse
            </tbody>
        </table>

        <h2>License alerts</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>Driver</th>
                    <th>License expiry</th>
                    <th>State</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($report['drivers']['licenses'] as $row)
                    <tr>
                        <td>{{ $row['driver_name'] }}</td>
                        <td>{{ $row['license_expiry'] }}</td>
                        <td>{{ !empty($row['expired']) ? 'Expired' : 'Expiring' }}</td>
                    </tr>
                @empty
                    <tr><td colspan="3">No license alerts.</td></tr>
                @endforelse
            </tbody>
        </table>
    @endif

    <h2>Vehicle bookings</h2>
    <table class="data">
        <thead>
            <tr>
                <th>ID</th>
                <th>Requested by</th>
                <th>Office</th>
                <th>Destination</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Travel</th>
                <th>Return</th>
                <th>Pax</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($report['bookings'] as $row)
                <tr>
                    <td>{{ $row['vehicle_booking_id'] }}</td>
                    <td>{{ $row['requested_by'] }}</td>
                    <td>{{ $row['office'] }}</td>
                    <td>{{ $row['destination'] }}</td>
                    <td>{{ $row['vehicle'] }}</td>
                    <td>{{ $row['driver'] }}</td>
                    <td>{{ $row['travel_date'] }} {{ $row['departure_time'] }}</td>
                    <td>{{ $row['expected_return_date'] }} {{ $row['expected_return_time'] }}</td>
                    <td>{{ $row['passenger_count'] }}</td>
                    <td>{{ ucfirst($row['status']) }}</td>
                </tr>
            @empty
                <tr><td colspan="10">No matching vehicle bookings.</td></tr>
            @endforelse
        </tbody>
    </table>
@endsection
