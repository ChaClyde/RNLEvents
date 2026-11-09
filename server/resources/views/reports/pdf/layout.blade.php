<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $report['title'] }}</title>
    <style>
        @page { margin: 28mm 12mm 18mm 12mm; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10px;
            color: #1E3A5F;
        }
        h1 { font-size: 18px; margin: 0 0 4px; color: #1E3A5F; }
        h2 { font-size: 13px; margin: 16px 0 8px; color: #0F766E; border-bottom: 1px solid #0095D9; padding-bottom: 4px; }
        .muted { color: #475569; }
        .org { color: #0095D9; font-weight: bold; margin-bottom: 8px; }
        .meta { width: 100%; margin-bottom: 10px; }
        .meta td { padding: 3px 6px; vertical-align: top; }
        .cards { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .cards td {
            width: 16.6%;
            background: #F8FAFC;
            border: 1px solid #1E3A5F;
            padding: 8px;
        }
        .cards .label { font-size: 8px; text-transform: uppercase; color: #0F766E; }
        .cards .value { font-size: 16px; font-weight: bold; }
        table.data { width: 100%; border-collapse: collapse; }
        table.data th {
            background: #1E3A5F;
            color: #ffffff;
            text-align: left;
            padding: 5px 6px;
            font-size: 8px;
        }
        table.data td {
            border-bottom: 1px solid #CBD5E1;
            padding: 4px 6px;
            font-size: 8px;
        }
        table.data tr:nth-child(even) td { background: #F1F5F9; }
        .note { margin-top: 8px; font-size: 8px; color: #0F766E; }
        thead { display: table-header-group; }
        tfoot { display: table-row-group; }
        tr { page-break-inside: avoid; }
    </style>
</head>
<body>
    <h1>{{ $report['title'] }}</h1>
    <div class="org">{{ $report['organization'] }}</div>
    <table class="meta">
        <tr>
            <td><strong>Report type:</strong> {{ $report['report_type'] }}</td>
            <td><strong>Generated:</strong> {{ $report['generated_at'] }}</td>
            <td><strong>Date range:</strong> {{ $report['date_range'] }}</td>
        </tr>
    </table>

    <h2>Applied filters</h2>
    <table class="data">
        <thead>
            <tr><th>Filter</th><th>Value</th></tr>
        </thead>
        <tbody>
            @foreach ($report['filters'] as $filter)
                <tr>
                    <td>{{ $filter['label'] }}</td>
                    <td>{{ $filter['value'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2>Summary statistics</h2>
    <table class="cards">
        <tr>
            @foreach ($report['cards'] as $card)
                <td>
                    <div class="label">{{ $card['label'] }}</div>
                    <div class="value">{{ number_format((int) $card['value']) }}</div>
                </td>
            @endforeach
        </tr>
    </table>

    @yield('content')

    @if (!empty($report['truncated']))
        <p class="note">Export limited to {{ number_format($report['export_limit']) }} of {{ number_format($report['total_matching']) }} matching records.</p>
    @else
        <p class="note">Exported {{ number_format($report['exported_count']) }} of {{ number_format($report['total_matching']) }} matching authorized records.</p>
    @endif
</body>
</html>
