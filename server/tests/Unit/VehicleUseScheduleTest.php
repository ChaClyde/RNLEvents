<?php

namespace Tests\Unit;

use App\VehicleBookings\VehicleUseSchedule;
use PHPUnit\Framework\TestCase;

class VehicleUseScheduleTest extends TestCase
{
    public function test_meal_allowance_follows_the_printed_sheet(): void
    {
        $within = VehicleUseSchedule::mealQuote('Roxas City and around', '2026-11-25', '2026-11-25');
        $outside = VehicleUseSchedule::mealQuote('Iloilo City', '2026-11-25', '2026-11-26', '08:00', '17:00');
        $meals = VehicleUseSchedule::mealQuote('Bailan', '2026-11-25', '2026-11-25', '11:00', '19:00');

        $this->assertSame(200.0, $within['meal_rate']);
        $this->assertSame(200.0, $within['driver_meal_amount']);
        $this->assertSame(300.0, $outside['meal_rate']);
        $this->assertSame(1200.0, $outside['driver_meal_amount']);
        $this->assertSame(2, $meals['meal_count']);
        $this->assertSame(400.0, $meals['driver_meal_amount']);
        $bailan = VehicleUseSchedule::chargeLines('Bailan', '2026-11-25', '2026-11-25', 4);
        $this->assertSame(440.0, VehicleUseSchedule::total($bailan));
        $roxas = VehicleUseSchedule::chargeLines('Roxas City and around', '2026-11-25', '2026-11-25', 4);
        $this->assertSame(900.0, VehicleUseSchedule::total($roxas));
        $this->assertSame('Official seating: 14 passengers.', VehicleUseSchedule::seatingNote('FCU Urvan'));
    }
}
