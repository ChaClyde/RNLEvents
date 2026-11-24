<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_vehicle_bookings', function (Blueprint $table) {
            $table->string('requester_signature_path', 255)->nullable()->after('tel_number');
            $table->string('requester_signature_mime', 100)->nullable()->after('requester_signature_path');
            $table->string('requester_signer_name', 150)->nullable()->after('requester_signature_mime');
            $table->string('requester_signer_position', 150)->nullable()->after('requester_signer_name');

            $table->string('charge_area', 20)->nullable()->after('passenger_details');
            $table->decimal('driver_meal_rate', 10, 2)->nullable()->after('charge_area');
            $table->unsignedSmallInteger('meal_count')->nullable()->after('driver_meal_rate');
            $table->decimal('driver_meal_amount', 10, 2)->nullable()->after('meal_count');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_vehicle_bookings', function (Blueprint $table) {
            $table->dropColumn([
                'requester_signature_path',
                'requester_signature_mime',
                'requester_signer_name',
                'requester_signer_position',
                'charge_area',
                'driver_meal_rate',
                'meal_count',
                'driver_meal_amount',
            ]);
        });
    }
};
