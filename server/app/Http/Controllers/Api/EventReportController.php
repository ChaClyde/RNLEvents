<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Reports\EventReportExporter;
use App\Reports\EventReportQuery;
use App\Reports\EventReportService;
use Illuminate\Http\Request;

class EventReportController extends Controller
{
    public function __construct(
        private readonly EventReportQuery $query,
        private readonly EventReportService $reports,
        private readonly EventReportExporter $exporter,
    ) {
    }

    public function summary(Request $request)
    {
        return $this->payload($request, fn ($user, $filters) => $this->reports->summary($user, $filters));
    }

    public function trends(Request $request)
    {
        return $this->payload($request, fn ($user, $filters) => $this->reports->trends($user, $filters));
    }

    public function venues(Request $request)
    {
        return $this->payload($request, fn ($user, $filters) => $this->reports->venues($user, $filters));
    }

    public function offices(Request $request)
    {
        return $this->payload($request, fn ($user, $filters) => $this->reports->offices($user, $filters));
    }

    public function bookings(Request $request)
    {
        return $this->payload($request, fn ($user, $filters) => $this->reports->bookings($user, $filters), false);
    }

    public function exportPdf(Request $request)
    {
        return $this->export($request, fn ($user, $filters) => $this->exporter->pdf($user, $filters));
    }

    public function exportExcel(Request $request)
    {
        return $this->export($request, fn ($user, $filters) => $this->exporter->excel($user, $filters));
    }

    /**
     * @param  callable(\App\Models\User, array<string, mixed>): mixed  $resolver
     */
    private function payload(Request $request, callable $resolver, bool $wrapData = true)
    {
        $user = $request->user();
        $this->query->authorize($user);

        $filters = $this->query->validatedFilters($request);
        $result = $resolver($user, $filters);

        if ($wrapData) {
            return response()->json([
                'message' => 'Event report loaded successfully.',
                'data' => $result,
            ]);
        }

        return response()->json(array_merge(
            ['message' => 'Event report loaded successfully.'],
            $result,
        ));
    }

    /**
     * @param  callable(\App\Models\User, array<string, mixed>): mixed  $resolver
     */
    private function export(Request $request, callable $resolver)
    {
        $user = $request->user();
        $this->query->authorize($user);

        return $resolver($user, $this->query->validatedFilters($request));
    }
}
