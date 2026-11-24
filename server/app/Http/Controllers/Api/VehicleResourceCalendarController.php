<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Models\VehicleMaintenance;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;

class VehicleResourceCalendarController extends Controller
{
    public function vehicleMonth(Request $request, int $vehicle_id)
    {
        $month = $this->month($request);
        $vehicle = Vehicle::query()->where('is_deleted', false)->findOrFail($vehicle_id);
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        return response()->json([
            'message' => 'Vehicle calendar loaded successfully.',
            'data' => [
                'name' => $vehicle->vehicle_name,
                'month' => $start->format('Y-m'),
                'days' => $this->days(
                    $start,
                    $end,
                    $this->trips('vehicle_id', $vehicle->vehicle_id, $start, $end),
                    $this->vehicleBlocks($vehicle, $start, $end),
                ),
            ],
        ]);
    }

    public function vehicleDay(Request $request, int $vehicle_id)
    {
        $date = $this->date($request);
        $vehicle = Vehicle::query()->where('is_deleted', false)->findOrFail($vehicle_id);
        $day = Carbon::parse($date);

        return response()->json([
            'message' => 'Vehicle day loaded successfully.',
            'data' => $this->dayPayload(
                $day,
                $this->trips('vehicle_id', $vehicle->vehicle_id, $day, $day),
                $this->vehicleBlocks($vehicle, $day, $day),
            ),
        ]);
    }

    public function driverMonth(Request $request, int $driver_id)
    {
        $month = $this->month($request);
        $driver = Driver::query()->where('is_deleted', false)->findOrFail($driver_id);
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        return response()->json([
            'message' => 'Driver calendar loaded successfully.',
            'data' => [
                'name' => $driver->driver_name,
                'month' => $start->format('Y-m'),
                'days' => $this->days(
                    $start,
                    $end,
                    $this->trips('driver_id', $driver->driver_id, $start, $end),
                    $this->driverBlocks($driver, $start, $end),
                ),
            ],
        ]);
    }

    public function driverDay(Request $request, int $driver_id)
    {
        $date = $this->date($request);
        $driver = Driver::query()->where('is_deleted', false)->findOrFail($driver_id);
        $day = Carbon::parse($date);

        return response()->json([
            'message' => 'Driver day loaded successfully.',
            'data' => $this->dayPayload(
                $day,
                $this->trips('driver_id', $driver->driver_id, $day, $day),
                $this->driverBlocks($driver, $day, $day),
            ),
        ]);
    }

    private function month(Request $request): Carbon
    {
        $validated = $request->validate([
            'month' => ['required', 'date_format:Y-m'],
        ]);

        return Carbon::createFromFormat('!Y-m', $validated['month'])->startOfMonth();
    }

    private function date(Request $request): string
    {
        return $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ])['date'];
    }

    /**
     * @return \Illuminate\Support\Collection<int, VehicleBooking>
     */
    private function trips(string $column, int $id, Carbon $start, Carbon $end)
    {
        return VehicleBooking::query()
            ->with(['office:office_id,office_name', 'vehicle:vehicle_id,vehicle_name', 'driver:driver_id,driver_name'])
            ->where('is_deleted', false)
            ->whereIn('status', ['pending', 'approved'])
            ->where($column, $id)
            ->whereDate('travel_date', '<=', $end->toDateString())
            ->whereDate('expected_return_date', '>=', $start->toDateString())
            ->orderBy('departure_time')
            ->get();
    }

    /**
     * @return list<array{date: string, reason: string}>
     */
    private function vehicleBlocks(Vehicle $vehicle, Carbon $start, Carbon $end): array
    {
        $blocks = [];

        if (in_array($vehicle->status, ['unavailable', 'maintenance'], true)) {
            $reason = $vehicle->status === 'maintenance'
                ? 'Under maintenance'
                : 'Unavailable';
            foreach (CarbonPeriod::create($start, $end) as $day) {
                $blocks[] = ['date' => $day->toDateString(), 'reason' => $reason];
            }
        }

        $rows = VehicleMaintenance::query()
            ->where('vehicle_id', $vehicle->vehicle_id)
            ->where('status', 'scheduled')
            ->whereDate('date_start', '<=', $end->toDateString())
            ->whereDate('date_end', '>=', $start->toDateString())
            ->get();

        foreach ($rows as $row) {
            $from = Carbon::parse($row->date_start)->max($start);
            $to = Carbon::parse($row->date_end)->min($end);
            foreach (CarbonPeriod::create($from, $to) as $day) {
                $blocks[] = [
                    'date' => $day->toDateString(),
                    'reason' => 'Under maintenance'.($row->reason ? ': '.$row->reason : ''),
                ];
            }
        }

        return $blocks;
    }

    /**
     * @return list<array{date: string, reason: string}>
     */
    private function driverBlocks(Driver $driver, Carbon $start, Carbon $end): array
    {
        if ($driver->driver_status === 'Available') {
            return [];
        }

        $from = $driver->status_start_date
            ? Carbon::parse($driver->status_start_date)->max($start)
            : $start->copy();
        $to = $driver->status_end_date
            ? Carbon::parse($driver->status_end_date)->min($end)
            : $end->copy();

        if ($to->lt($start) || $from->gt($end) || $from->gt($to)) {
            return [];
        }

        $blocks = [];
        foreach (CarbonPeriod::create($from, $to) as $day) {
            $blocks[] = [
                'date' => $day->toDateString(),
                'reason' => $driver->driver_status,
            ];
        }

        return $blocks;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, VehicleBooking>  $trips
     * @param  list<array{date: string, reason: string}>  $blocks
     */
    private function days(Carbon $start, Carbon $end, $trips, array $blocks): array
    {
        $days = [];
        foreach (CarbonPeriod::create($start, $end) as $day) {
            $date = $day->toDateString();
            $count = $trips->filter(fn (VehicleBooking $trip) => $this->covers($trip, $date))->count();
            $reasons = array_values(array_unique(array_map(
                fn (array $block) => $block['reason'],
                array_filter($blocks, fn (array $block) => $block['date'] === $date),
            )));

            if ($count === 0 && $reasons === []) {
                continue;
            }

            $days[] = [
                'date' => $date,
                'status' => $reasons !== [] ? 'blocked' : ($count > 0 ? 'booked' : 'partial'),
                'trips_count' => $count,
                'reasons' => $reasons,
            ];
        }

        return $days;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, VehicleBooking>  $trips
     * @param  list<array{date: string, reason: string}>  $blocks
     */
    private function dayPayload(Carbon $day, $trips, array $blocks): array
    {
        $date = $day->toDateString();

        return [
            'date' => $date,
            'day' => $day->format('l'),
            'reasons' => array_values(array_unique(array_map(
                fn (array $block) => $block['reason'],
                array_filter($blocks, fn (array $block) => $block['date'] === $date),
            ))),
            'trips' => $trips
                ->filter(fn (VehicleBooking $trip) => $this->covers($trip, $date))
                ->map(fn (VehicleBooking $trip) => [
                    'vehicle_booking_id' => $trip->vehicle_booking_id,
                    'purpose' => $trip->purpose,
                    'destination' => $trip->destination,
                    'status' => $trip->status,
                    'office' => $trip->office?->office_name,
                    'vehicle' => $trip->vehicle?->vehicle_name,
                    'driver' => $trip->driver?->driver_name,
                    'time' => substr((string) $trip->departure_time, 0, 5).' – '.substr((string) $trip->expected_return_time, 0, 5),
                ])
                ->values(),
        ];
    }

    private function covers(VehicleBooking $trip, string $date): bool
    {
        return $trip->travel_date->toDateString() <= $date
            && $trip->expected_return_date->toDateString() >= $date;
    }
}
