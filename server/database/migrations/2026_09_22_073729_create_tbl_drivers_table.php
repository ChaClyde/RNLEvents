<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // NOTE: this migration references tbl_vehicles, so its filename timestamp
    // must sort AFTER the vehicles migration. Rename the file if needed.

    public function up(): void
    {
        Schema::create('tbl_drivers', function (Blueprint $table) {
            $table->id('driver_id');

            // Profile
            $table->string('driver_name', 100);
            $table->string('contact_number', 30)->nullable();
            $table->string('email', 255)->nullable();

            // License (an expired license blocks assignment)
            $table->string('license_number', 50)->nullable()->unique();
            $table->date('license_expiry')->nullable();

            // Assignment
            $table->boolean('is_reliever')->default(false);
            $table->foreignId('default_vehicle_id')
                ->nullable()
                ->constrained('tbl_vehicles', 'vehicle_id')
                ->nullOnDelete();

            // Availability
            $table->enum('driver_status', [
                'Available',
                'On Leave',
                'Sick Leave',
                'Unavailable',
            ])->default('Available');

            $table->string('status_remarks', 255)->nullable();

            // Period covered by a non-available status.
            // Both empty = unavailable until set back to Available.
            $table->date('status_start_date')->nullable();
            $table->date('status_end_date')->nullable();

            // Soft Delete
            $table->boolean('is_deleted')->default(false);

            $table->timestamps();

            $table->index(['driver_status', 'is_deleted']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_drivers');
    }
};
