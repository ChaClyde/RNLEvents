<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>FCU Event Booking Slip {{ $slip['booking_id'] }}</title>
    <style>
        @page { margin: 16mm 14mm 16mm 14mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1E3A5F; }
        h1 { font-size: 18px; margin: 0; }
        h2 { font-size: 12px; margin: 14px 0 6px; color: #0F766E; border-bottom: 1px solid #0095D9; padding-bottom: 3px; }
        .org { font-size: 13px; font-weight: bold; color: #0095D9; margin: 0; }
        .sub { margin: 2px 0 0; color: #475569; }
        table { width: 100%; border-collapse: collapse; }
        td, th { vertical-align: top; text-align: left; }
        .meta td { padding: 2px 8px 2px 0; }
        .grid td { width: 50%; padding: 3px 8px 3px 0; }
        .label { font-size: 8px; text-transform: uppercase; color: #0F766E; }
        .box { border: 1px solid #CBD5E1; padding: 8px; }
        table.data th { background: #1E3A5F; color: #fff; font-size: 9px; padding: 4px 6px; }
        table.data td { border-bottom: 1px solid #E2E8F0; padding: 4px 6px; font-size: 10px; }
        .sign { height: 42px; border-bottom: 1px solid #1E3A5F; }
        .note { font-size: 9px; color: #475569; }
        tr { page-break-inside: avoid; }
    </style>
</head>
<body>
    <p class="org">{{ $slip['organization'] }}</p>
    <h1>{{ $slip['title'] }}</h1>
    <p class="sub">FilSched event booking record. This slip does not assign an official control number.</p>

    <table class="meta">
        <tr>
            <td><strong>Booking record:</strong> {{ $slip['booking_id'] }}</td>
            <td><strong>Generated:</strong> {{ $slip['generated_at'] }}</td>
            <td><strong>Status:</strong> {{ $slip['status'] }}</td>
            <td><strong>Approved:</strong> {{ $slip['approved_at'] ?? 'Not yet approved' }}</td>
        </tr>
    </table>

    <h2>Event booking</h2>
    <table class="grid">
        <tr>
            <td><div class="label">Event title</div>{{ $slip['purpose'] }}</td>
            <td><div class="label">Current stage</div>{{ $slip['current_stage'] }}</td>
        </tr>
        <tr>
            <td colspan="2">
                <div class="label">Description</div>
                {{ $slip['description'] ?? 'No description recorded.' }}
            </td>
        </tr>
        <tr>
            <td><div class="label">Venue</div>{{ $slip['venue'] ?? 'Not recorded' }}</td>
            <td><div class="label">Location</div>{{ $slip['location'] ?? 'Not recorded' }}</td>
        </tr>
        <tr>
            <td><div class="label">Venue capacity</div>{{ $slip['capacity'] !== null ? $slip['capacity'] : 'Not recorded' }}</td>
            <td><div class="label">Expected attendees</div>{{ $slip['expected_attendees'] }}</td>
        </tr>
    </table>

    <h2>Requester</h2>
    <table class="grid">
        <tr>
            <td><div class="label">Requested by</div>{{ $slip['requested_by'] ?? 'Not recorded' }}</td>
            <td><div class="label">Office</div>{{ $slip['office'] ?? 'Not recorded' }}</td>
        </tr>
        <tr>
            <td><div class="label">Email</div>{{ $slip['email'] ?? 'Not recorded' }}</td>
            <td><div class="label">Telephone</div>{{ $slip['telephone'] ?? 'Not recorded' }}</td>
        </tr>
        <tr>
            <td colspan="2">
                <div class="label">Requester e-signature</div>
                @if (!empty($slip['requester_signature_uri']))
                    <img src="{{ $slip['requester_signature_uri'] }}" alt="Requester e-signature" style="height: 42px;">
                    <div>{{ $slip['requester_signer_name'] ?? $slip['requested_by'] }}</div>
                    <div class="note">{{ $slip['requester_signer_position'] ?: 'Position not recorded' }}</div>
                @else
                    <div class="sign"></div>
                    <span class="note">No requester e-signature was recorded.</span>
                @endif
            </td>
        </tr>
    </table>

    <h2>Schedule</h2>
    <p class="note">Pattern: {{ $slip['schedule_type'] }}</p>
    <table class="data">
        <thead>
            <tr><th>Date</th><th>Time</th></tr>
        </thead>
        <tbody>
            @foreach ($slip['schedules'] as $row)
                <tr>
                    <td>{{ $row['date'] }}</td>
                    <td>{{ $row['time'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2>Facilities and equipment</h2>
    @if (count($slip['resources']) === 0)
        <p>No facilities or equipment were recorded.</p>
    @else
        <table class="data">
            <thead>
                <tr><th>Item</th><th>Quantity</th><th>Notes</th></tr>
            </thead>
            <tbody>
                @foreach ($slip['resources'] as $item)
                    <tr>
                        <td>{{ $item['name'] }}</td>
                        <td>{{ $item['quantity'] }}</td>
                        <td>{{ $item['notes'] ?: 'None recorded' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h2>Letter of request</h2>
    @if (count($slip['letters']) === 0)
        <p>No letter of request is attached.</p>
    @else
        <ul>
            @foreach ($slip['letters'] as $filename)
                <li>{{ $filename }}</li>
            @endforeach
        </ul>
    @endif

    @if ($slip['gym'])
        <h2>FCU Gym policy</h2>
        <table class="grid">
            <tr>
                <td><div class="label">Responsibility acknowledgment</div>{{ $slip['gym']['acknowledgment'] }}</td>
                <td><div class="label">Reservation length</div>{{ $slip['gym']['reservation_span'] }}</td>
            </tr>
            <tr>
                <td colspan="2">
                    <div class="label">University-wide activity</div>
                    @if ($slip['gym']['university_wide'])
                        Designated by {{ $slip['gym']['designated_by'] }}
                        @if ($slip['gym']['designated_at'])
                            on {{ $slip['gym']['designated_at'] }}
                        @endif
                    @else
                        Not designated
                    @endif
                </td>
            </tr>
        </table>
        @if ($slip['gym']['acknowledged'] && $slip['gym']['statement'])
            <p>{{ $slip['gym']['statement'] }}</p>
        @endif
        @if ($slip['gym']['reservation_span'] === 'Whole semester' || $slip['gym']['reservation_span'] === 'Whole summer')
            <p class="note">This kind of Gym reservation is strongly discouraged.</p>
        @endif
    @endif

    <h2>Fees</h2>
    @if (!$slip['fees']['recorded'])
        <p>{{ $slip['fees']['note'] }}</p>
    @else
        @if (count($slip['fees']['lines']) === 0)
            <p>{{ $slip['fees']['note'] }}</p>
        @else
            @if (count($slip['fees']['groups']) > 0)
                <table class="data">
                    <thead>
                        <tr><th>Category</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                        @foreach ($slip['fees']['groups'] as $group)
                            <tr>
                                <td>{{ $group['category'] }}</td>
                                <td>{{ number_format((float) $group['amount'], 2) }}</td>
                            </tr>
                        @endforeach
                        @if ($slip['fees']['total'] !== null)
                            <tr>
                                <td><strong>Grand total</strong></td>
                                <td><strong>{{ number_format((float) $slip['fees']['total'], 2) }}</strong></td>
                            </tr>
                        @endif
                    </tbody>
                </table>
            @endif
            <table class="data">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Charge</th>
                        <th>Quantity</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($slip['fees']['lines'] as $line)
                        <tr>
                            <td>{{ $line['date'] ?: 'Booking' }}</td>
                            <td>{{ $line['category'] }}</td>
                            <td>{{ $line['label'] }}</td>
                            <td>{{ $line['quantity'] }} {{ $line['unit'] }}</td>
                            <td>{{ number_format((float) $line['unit_amount'], 2) }}</td>
                            <td>{{ number_format((float) $line['amount'], 2) }}</td>
                        </tr>
                    @endforeach
                    @if ($slip['fees']['total'] !== null)
                        <tr>
                            <td colspan="5"><strong>Total fee</strong></td>
                            <td><strong>{{ number_format((float) $slip['fees']['total'], 2) }}</strong></td>
                        </tr>
                    @endif
                </tbody>
            </table>
            @if ($slip['fees']['note'])
                <p class="note">{{ $slip['fees']['note'] }}</p>
            @endif
        @endif
    @endif

    <h2>Endorsement and approval</h2>
    <p class="note">
        @if ($slip['financial_slots'])
            Sequence: Office Head, Event Admin, Business Manager, VP-Finance, Super Admin.
        @else
            Sequence: Office Head, Event Admin, Event Approval Admin, Super Admin.
        @endif
        A signature is recorded when an authorized approver approves the booking. An older approval without a stored signature may show no signature.
    </p>
    @if ($slip['cancellation_reason'])
        <p><strong>Cancellation reason:</strong> {{ $slip['cancellation_reason'] }}</p>
    @endif
    @if ($slip['approval_remarks'])
        <p><strong>Latest approval remarks:</strong> {{ $slip['approval_remarks'] }}</p>
    @endif

    <table class="data">
        <thead>
            <tr>
                <th>Stage</th>
                <th>Decision</th>
                <th>Approver</th>
                <th>Date</th>
                <th>Remarks</th>
                <th>Signature</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($slip['stages'] as $stage)
                <tr>
                    <td>{{ $stage['label'] }}</td>
                    <td>{{ $stage['state'] }}</td>
                    <td>
                        {{ $stage['approver'] ?? 'Not recorded' }}
                        <div class="note">{{ $stage['position'] ?: 'Position not recorded' }}</div>
                    </td>
                    <td>{{ $stage['decided_at'] ?? 'Not recorded' }}</td>
                    <td>{{ $stage['remarks'] ?: 'No remarks recorded' }}</td>
                    <td>
                        @if ($stage['signature_uri'])
                            <img src="{{ $stage['signature_uri'] }}" alt="Approval signature" style="height: 36px;">
                        @elseif ($stage['action'] === 'rejected')
                            <span class="note">Rejected approvals are not signed.</span>
                        @elseif ($stage['action'] === 'approved')
                            <span class="note">No signature was recorded for this approval.</span>
                        @else
                            <div class="sign"></div>
                            <span class="note">Signature placeholder</span>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
