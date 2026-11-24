<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>FCU Vehicle Booking Slip {{ $slip['booking_id'] }}</title>
    <style>
        @page { margin: 14mm 12mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1E3A5F; }
        h1 { font-size: 16px; margin: 0; }
        h2 { font-size: 12px; margin: 14px 0 6px; color: #0F766E; border-bottom: 1px solid #0095D9; padding-bottom: 3px; }
        .org { font-size: 13px; font-weight: bold; color: #0095D9; margin: 0; }
        .sub { margin: 2px 0 0; color: #475569; }
        table { width: 100%; border-collapse: collapse; }
        td, th { vertical-align: top; text-align: left; }
        .grid td { width: 50%; padding: 3px 8px 3px 0; }
        .label { font-size: 8px; text-transform: uppercase; color: #0F766E; }
        table.data th { background: #1E3A5F; color: #fff; font-size: 9px; padding: 4px 6px; }
        table.data td { border-bottom: 1px solid #E2E8F0; padding: 4px 6px; font-size: 10px; }
        .note { font-size: 9px; color: #475569; }
        .sign { height: 36px; }
        tr { page-break-inside: avoid; }
    </style>
</head>
<body>
    <p class="org">{{ $slip['organization'] }}</p>
    <h1>{{ $slip['title'] }}</h1>
    <p class="sub">FilSched vehicle booking record. Form reference FCU-EOMS-PO-002-F and computation sheet FCU-EOMS-BO-001-D.</p>
    <p class="note">Record {{ $slip['booking_id'] }} · Generated {{ $slip['generated_at'] }} · Status {{ $slip['status'] }} · Now with {{ $slip['current_stage'] }}</p>

    <h2>Requester</h2>
    <table class="grid">
        <tr>
            <td><div class="label">Requested by</div>{{ $slip['requested_by'] ?: 'Not recorded' }}</td>
            <td><div class="label">Office</div>{{ $slip['office'] ?: 'Not recorded' }}</td>
        </tr>
        <tr>
            <td><div class="label">Email</div>{{ $slip['email'] ?: 'Not recorded' }}</td>
            <td><div class="label">Telephone</div>{{ $slip['telephone'] ?: 'Not recorded' }}</td>
        </tr>
        <tr>
            <td colspan="2">
                <div class="label">E-signature at the time of booking</div>
                @if (!empty($slip['requester_signature_uri']))
                    <img class="sign" src="{{ $slip['requester_signature_uri'] }}" alt="Requester e-signature">
                    <div>{{ $slip['requester_signer_name'] ?: $slip['requested_by'] }}</div>
                    <div class="note">{{ $slip['requester_signer_position'] ?: 'Position not recorded' }}</div>
                @else
                    <span class="note">No requester e-signature was recorded.</span>
                @endif
            </td>
        </tr>
    </table>

    <h2>Trip</h2>
    <table class="grid">
        <tr>
            <td><div class="label">Destination</div>{{ $slip['destination'] ?: 'Not recorded' }}</td>
            <td><div class="label">Travel</div>{{ $slip['travel'] }}</td>
        </tr>
        <tr>
            <td colspan="2"><div class="label">Purpose</div>{{ $slip['purpose'] ?: 'Not recorded' }}</td>
        </tr>
        <tr>
            <td><div class="label">Passengers</div>{{ $slip['passengers'] }}</td>
            <td><div class="label">Passenger details</div>{{ $slip['passenger_details'] ?: 'None recorded' }}</td>
        </tr>
        <tr>
            <td>
                <div class="label">Vehicle</div>{{ $slip['vehicle'] }}
                @if ($slip['seating'])<div class="note">{{ $slip['seating'] }}</div>@endif
            </td>
            <td><div class="label">Driver</div>{{ $slip['driver'] }}</td>
        </tr>
        @if ($slip['remarks'])
            <tr>
                <td colspan="2"><div class="label">Remarks</div>{{ $slip['remarks'] }}</td>
            </tr>
        @endif
    </table>

    <h2>Expense breakdown</h2>
    <p class="note">Each line explains what the October 1, 2025 computation sheet charges. Official lines stay on the request. Vehicle Admin and Admin Approvals may add or remove only an additional price.</p>
    @if (count($slip['charges']) === 0)
        <p>No charge breakdown is recorded for this destination.</p>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th>Charge</th>
                    <th>What it covers</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($slip['charges'] as $line)
                    <tr>
                        <td>{{ $line['label'] }}</td>
                        <td>
                            @foreach ($line['rows'] as $row)
                                <div>{{ $row }}</div>
                            @endforeach
                        </td>
                        <td>{{ $line['quantity'] }}</td>
                        <td>PHP {{ $line['unit_amount'] }}</td>
                        <td>PHP {{ $line['amount'] }}</td>
                    </tr>
                @endforeach
                <tr>
                    <td colspan="4"><strong>Total</strong></td>
                    <td><strong>PHP {{ $slip['charge_total'] ?? '0.00' }}</strong></td>
                </tr>
            </tbody>
        </table>
    @endif

    <h2>Letter of request</h2>
    @if (count($slip['letters']) === 0)
        <p>No letter or file is attached.</p>
    @else
        <ul>
            @foreach ($slip['letters'] as $filename)
                <li>{{ $filename }}</li>
            @endforeach
        </ul>
        <p class="note">The attached file travels with this request and can be opened from the approval screen.</p>
    @endif

    <h2>Approvals</h2>
    <p class="note">Each approval stores the approver's e-signature and the time the decision was recorded.</p>
    <table class="data">
        <thead>
            <tr>
                <th>Step</th>
                <th>Decision and time</th>
                <th>E-signature</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($slip['stages'] as $stage)
                <tr>
                    <td>{{ $stage['label'] }}</td>
                    <td>
                        {{ $stage['action'] }}
                        @if ($stage['decided_at'])
                            <div>{{ $stage['decided_at'] }}</div>
                        @endif
                        @if ($stage['name'])
                            <div>{{ $stage['name'] }}</div>
                        @endif
                        @if ($stage['position'])
                            <div class="note">{{ $stage['position'] }}</div>
                        @endif
                        @if ($stage['remarks'])
                            <div class="note">{{ $stage['remarks'] }}</div>
                        @endif
                    </td>
                    <td>
                        @if (!empty($stage['signature_uri']))
                            <img class="sign" src="{{ $stage['signature_uri'] }}" alt="Approval e-signature">
                        @else
                            <span class="note">No e-signature yet.</span>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
