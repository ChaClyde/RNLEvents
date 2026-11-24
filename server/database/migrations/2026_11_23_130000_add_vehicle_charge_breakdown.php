<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_vehicle_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_vehicle_bookings', 'charge_lines')) {
                $table->json('charge_lines')->nullable()->after('driver_meal_amount');
            }
            if (!Schema::hasColumn('tbl_vehicle_bookings', 'charge_total')) {
                $table->decimal('charge_total', 12, 2)->nullable()->after('charge_lines');
            }
            if (!Schema::hasColumn('tbl_vehicle_bookings', 'calculation_confirmed_at')) {
                $table->timestamp('calculation_confirmed_at')->nullable()->after('charge_total');
            }
            if (!Schema::hasColumn('tbl_vehicle_bookings', 'calculation_confirmed_stage')) {
                $table->string('calculation_confirmed_stage', 40)->nullable()->after('calculation_confirmed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tbl_vehicle_bookings', function (Blueprint $table) {
            $table->dropColumn([
                'charge_lines',
                'charge_total',
                'calculation_confirmed_at',
                'calculation_confirmed_stage',
            ]);
        });
    }
};
