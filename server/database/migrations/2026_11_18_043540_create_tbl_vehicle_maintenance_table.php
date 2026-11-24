<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_vehicle_maintenance', function (Blueprint $table) {
            $table->id('maintenance_id');

            // Vehicle (maintenance rows are removed with the vehicle)
            $table->foreignId('vehicle_id')
                ->constrained('tbl_vehicles', 'vehicle_id')
                ->cascadeOnDelete();

            // What is being done
            $table->string('reason', 150); // e.g. "Oil change"
            $table->text('notes')->nullable();

            // Whole days the vehicle is out of service (inclusive)
            $table->date('date_start');
            $table->date('date_end');

            // Only "scheduled" records block the vehicle
            $table->enum('status', [
                'scheduled',
                'completed',
                'cancelled',
            ])->default('scheduled');

            $table->timestamps();

            // Fast "is this vehicle out of service on these dates?" checks
            $table->index(
                ['vehicle_id', 'status', 'date_start', 'date_end'],
                'vehicle_maintenance_schedule_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_vehicle_maintenance');
    }
};