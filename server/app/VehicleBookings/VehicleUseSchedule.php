<?php

namespace App\VehicleBookings;

use Carbon\Carbon;

/**
 * Rates from FCU-EOMS-BO-001-D, effectivity October 1, 2025.
 * A slash on the printed sheet is stored as a separate destination with its own fare.
 */
final class VehicleUseSchedule
{
    public const MEAL_WITHIN_CAPIZ = 200.0;

    public const MEAL_OUTSIDE_CAPIZ = 300.0;

    /**
     * @return list<array{name: string, within_capiz: bool, basis: string, fare: float|null}>
     */
    public static function destinations(): array
    {
        $perPerson = [
            ['Caticlan', false, 240],
            ['Altavas', false, 80],
            ['Banga', false, 130],
            ['Batan', false, 110],
            ['Kalibo', false, 170],
            ['San Jose', false, 280],
            ['Lawaan', false, 260],
            ['Bailan', true, 60],
            ['Cuartero', true, 70],
            ['Dao', true, 65],
            ['Dumalag', true, 70],
            ['Dumarao', true, 85],
            ['Ivisan', true, 35],
            ['Jamindan', true, 100],
            ['Pres. Roxas (Lutod-lutod)', true, 70],
            ['Maayon', true, 70],
            ['Mambusao', true, 80],
            ['Panay', true, 40],
            ['Panitan', true, 30],
            ['Pilar', true, 80],
            ['Pontevedra', true, 55],
            ['Sapi-an', true, 70],
            ['Sigma', true, 60],
            ['Tapaz', true, 100],
            ['Timpas, Panitan', true, 50],
            ['Balasan', false, 90],
            ['Barotac Viejo (Camp HG)', false, 200],
            ['Batad', false, 140],
            ['Bingawan', false, 100],
            ['Dumangas', false, 130],
            ['Dumaguete', false, 350],
            ['Bacolod', false, 300],
            ['Kabankalan', false, 400],
            ['Estancia', false, 100],
            ['Iloilo City', false, 250],
            ['Leon / Oton', false, 200],
            ['Passi', false, 125],
            ['Pototan', false, 130],
            ['San Dionisio', false, 140],
            ['Carles', false, 100],
            ['San Enrique', false, 110],
        ];

        $rows = array_map(fn (array $row) => [
            'name' => $row[0],
            'within_capiz' => $row[1],
            'basis' => 'per_person',
            'fare' => (float) $row[2],
        ], $perPerson);

        $rows[] = [
            'name' => 'Roxas City and around',
            'within_capiz' => true,
            'basis' => 'whole_day',
            'fare' => null,
        ];
        $rows[] = [
            'name' => 'Vigil Service',
            'within_capiz' => true,
            'basis' => 'fuel_only',
            'fare' => null,
        ];

        return $rows;
    }

    public static function find(string $destination): ?array
    {
        $needle = self::normalize($destination);

        foreach (self::destinations() as $row) {
            if (self::normalize($row['name']) === $needle) {
                return $row;
            }
        }

        return null;
    }

    /**
     * Breakfast 7:00 AM, lunch 12:00 PM, and dinner 6:00 PM.
     * A meal is counted when the trip covers that time.
     *
     * @return array{area: string, meal_rate: float, meal_count: int, day_count: int, meals: list<array{name: string, days: int}>, driver_meal_amount: float}|null
     */
    public static function mealQuote(
        string $destination,
        string $travelDate,
        string $returnDate,
        string $departureTime = '08:00',
        string $returnTime = '17:00',
    ): ?array {
        $row = self::find($destination);

        if ($row === null) {
            return null;
        }

        $start = Carbon::parse($travelDate.' '.substr($departureTime, 0, 5));
        $end = Carbon::parse($returnDate.' '.substr($returnTime, 0, 5));

        if ($end->lt($start)) {
            return null;
        }

        $counts = [
            'Breakfast' => 0,
            'Lunch' => 0,
            'Dinner' => 0,
        ];
        $clocks = [
            'Breakfast' => '07:00',
            'Lunch' => '12:00',
            'Dinner' => '18:00',
        ];

        for ($day = $start->copy()->startOfDay(); $day->lte($end->copy()->startOfDay()); $day->addDay()) {
            foreach ($clocks as $name => $clock) {
                $moment = Carbon::parse($day->toDateString().' '.$clock);
                if ($moment->gte($start) && $moment->lte($end)) {
                    $counts[$name]++;
                }
            }
        }

        $meals = [];
        foreach ($counts as $name => $days) {
            if ($days > 0) {
                $meals[] = ['name' => $name, 'days' => $days];
            }
        }

        $mealCount = array_sum($counts);
        $rate = $row['within_capiz'] ? self::MEAL_WITHIN_CAPIZ : self::MEAL_OUTSIDE_CAPIZ;

        return [
            'area' => $row['within_capiz'] ? 'within_capiz' : 'outside_capiz',
            'meal_rate' => $rate,
            'meal_count' => $mealCount,
            'day_count' => self::days($travelDate, $returnDate),
            'meals' => $meals,
            'driver_meal_amount' => round($rate * $mealCount, 2),
        ];
    }

    /**
     * @return list<array{id: string, label: string, quantity: float, unit_amount: float, removable: bool}>
     */
    public static function chargeLines(
        string $destination,
        string $travelDate,
        string $returnDate,
        int $passengers,
        string $departureTime = '08:00',
        string $returnTime = '17:00',
    ): array {
        $row = self::find($destination);
        $meal = self::mealQuote($destination, $travelDate, $returnDate, $departureTime, $returnTime);

        if ($row === null || $meal === null) {
            return [];
        }

        $lines = [];
        $days = $meal['meal_count'];
        $passengers = max(1, $passengers);

        if ($row['basis'] === 'per_person') {
            $lines[] = [
                'id' => 'passenger_fare',
                'label' => 'Fare per person · '.$row['name'],
                'detail' => self::lineDetail('passenger_fare'),
                'quantity' => $passengers,
                'unit_amount' => (float) $row['fare'],
                'removable' => false,
            ];
        } elseif ($row['basis'] === 'whole_day') {
            $lines[] = [
                'id' => 'fuel',
                'label' => 'Fuel · Roxas City and around',
                'detail' => self::lineDetail('fuel'),
                'quantity' => $days,
                'unit_amount' => 400.0,
                'removable' => false,
            ];
            $lines[] = [
                'id' => 'wear_tear',
                'label' => 'Wear and tear · Roxas City and around',
                'detail' => self::lineDetail('wear_tear'),
                'quantity' => $days,
                'unit_amount' => 300.0,
                'removable' => false,
            ];
        } else {
            $lines[] = [
                'id' => 'fuel_only',
                'label' => 'Vigil service · fuel only',
                'detail' => self::lineDetail('fuel_only'),
                'quantity' => 1,
                'unit_amount' => 0.0,
                'removable' => false,
            ];
        }

        $mealNames = array_map(fn (array $item) => $item['name'], $meal['meals']);
        $lines[] = [
            'id' => 'driver_meal',
            'label' => "Driver's meal allowance",
            'detail' => self::lineDetail('driver_meal'),
            'quantity' => $meal['meal_count'],
            'unit_amount' => $meal['meal_rate'],
            'meal_rate' => $meal['meal_rate'],
            'day_count' => $meal['day_count'],
            'meal_breakdown' => $meal['meals'],
            'meal_names' => $mealNames,
            'removable' => false,
        ];

        return $lines;
    }

    public static function lineDetail(string $id): string
    {
        return match ($id) {
            'passenger_fare' => 'Passenger fare from the October 1, 2025 computation sheet. It is charged once for each passenger.',
            'fuel' => 'Fuel for a trip that stays in Roxas City and around. The sheet charges ₱400 for the whole vehicle on each travel day, not for each passenger.',
            'wear_tear' => 'Wear and tear for a trip that stays in Roxas City and around. The sheet charges ₱300 for the whole vehicle on each travel day. Fuel and wear and tear together are ₱700 for the whole day.',
            'fuel_only' => 'Vigil service is marked Fuel Only on the sheet. No peso amount is printed, so this line starts at zero until Vehicle Admin or Admin Approvals enters the fuel cost.',
            'driver_meal' => 'Driver\'s meal allowance, paid directly to the driver. Within Capiz is ₱200 per meal. Outside Capiz is ₱300 per meal. Breakfast is counted at 7:00 AM, lunch at 12:00 PM, and dinner at 6:00 PM when the trip covers that time.',
            default => 'Additional charge. This amount is not printed on the October 1, 2025 fare sheet.',
        };
    }

    /**
     * @return list<string>
     */
    public static function presentLine(array $line): array
    {
        $money = fn ($amount) => '₱'.number_format((float) $amount, 2);
        $quantity = (float) ($line['quantity'] ?? 0);
        $unit = (float) ($line['unit_amount'] ?? 0);
        $total = self::lineTotal($line);
        $id = (string) ($line['id'] ?? '');

        if ($id === 'passenger_fare') {
            return [
                'Fare per person: '.$money($unit),
                'Number of passengers: '.rtrim(rtrim(number_format($quantity, 2), '0'), '.'),
                'Total: '.$money($total),
            ];
        }

        if ($id === 'driver_meal') {
            $rate = (float) ($line['meal_rate'] ?? $unit);
            $meals = is_array($line['meal_breakdown'] ?? null) ? $line['meal_breakdown'] : [];
            $rows = ['Rate: '.$money($rate).' per meal'];

            if ($meals === []) {
                $rows[] = 'No breakfast, lunch, or dinner falls within this schedule.';
                $rows[] = 'Total: '.$money($total);

                return $rows;
            }

            $dayCounts = array_map(fn ($item) => (int) ($item['days'] ?? 0), $meals);
            $sameDays = count(array_unique($dayCounts)) === 1;
            $names = implode(' and ', array_map(fn ($item) => $item['name'] ?? 'Meal', $meals));

            if ($sameDays) {
                $perDay = count($meals);
                $daily = $rate * $perDay;
                $rows[] = $names;
                $rows[] = $money($rate).' × '.$perDay.' = '.$money($daily).' per day';
                $rows[] = $money($daily).' × '.$dayCounts[0].' day'.($dayCounts[0] === 1 ? '' : 's');
            } else {
                foreach ($meals as $item) {
                    $days = (int) ($item['days'] ?? 0);
                    $rows[] = ($item['name'] ?? 'Meal').': '.$money($rate).' × '.$days.' day'.($days === 1 ? '' : 's').' = '.$money($rate * $days);
                }
            }

            $rows[] = 'Total: '.$money($total);

            return $rows;
        }

        if (!empty($line['removable'])) {
            $rows = [
                'Name: '.($line['label'] ?? 'Additional charge'),
                'Quantity: '.rtrim(rtrim(number_format($quantity, 2), '0'), '.'),
                'Price: '.$money($unit),
                'Total: '.$money($total),
            ];
            if (!empty($line['added_by_name'])) {
                $when = !empty($line['added_at'])
                    ? Carbon::parse($line['added_at'])->format('M j, Y g:i A')
                    : 'time not recorded';
                $rows[] = 'Added by '.$line['added_by_name'].' on '.$when;
            }

            return $rows;
        }

        return [
            ($line['label'] ?? 'Charge').': '.$money($unit).' × '.rtrim(rtrim(number_format($quantity, 2), '0'), '.').' = '.$money($total),
        ];
    }

    public static function lineTotal(array $line): float
    {
        return round(((float) $line['quantity']) * ((float) $line['unit_amount']), 2);
    }

    /**
     * @param  list<array{quantity: float|int, unit_amount: float|int}>  $lines
     */
    public static function total(array $lines): float
    {
        $sum = 0.0;
        foreach ($lines as $line) {
            $sum += self::lineTotal($line);
        }

        return round($sum, 2);
    }

    public static function seatingNote(?string $vehicleName): ?string
    {
        $name = self::normalize((string) $vehicleName);

        return match (true) {
            str_contains($name, 'urvan') => 'Official seating: 14 passengers.',
            str_contains($name, 'hiace'), str_contains($name, 'hi ace') => 'Official seating: 12 passengers.',
            str_contains($name, 'crosswind') => 'Official seating: 8 passengers.',
            str_contains($name, 'canter') => 'Official seating: 3 passengers plus 11 in the back.',
            str_contains($name, 'frontier') => 'Official seating: 4 passengers plus 5 in the back.',
            str_contains($name, 'commuter') => 'Official seating: 14 passengers.',
            default => null,
        };
    }

    private static function days(string $travelDate, string $returnDate): int
    {
        $start = strtotime($travelDate);
        $end = strtotime($returnDate);

        if ($start === false || $end === false || $end < $start) {
            return 1;
        }

        return (int) floor(($end - $start) / 86400) + 1;
    }

    private static function normalize(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9]+/', ' ', $value) ?? $value;

        return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
    }
}
