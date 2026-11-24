<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // NOTE: this migration references tbl_users, tbl_offices, tbl_vehicles and
    // tbl_drivers, so its filename timestamp must sort AFTER all of them.
    // Rename the file if needed.

    public function up(): void
    {
        Schema::create('tbl_vehicle_bookings', function (Blueprint $table) {
            $table->id('vehicle_booking_id');

            // Requestor
            $table->foreignId('requested_by_user_id')
                ->constrained('tbl_users', 'user_id')
                ->restrictOnDelete();

            $table->foreignId('office_id')
                ->constrained('tbl_offices', 'office_id')
                ->restrictOnDelete();

            $table->string('requested_by', 150);
            $table->string('email', 150);
            $table->string('tel_number', 30);

            // Trip Information
            $table->string('destination', 255);
            $table->string('purpose', 200);
            $table->text('remarks')->nullable();

            // Schedule
            $table->date('travel_date');
            $table->time('departure_time');
            $table->date('expected_return_date');
            $table->time('expected_return_time');

            // Passengers
            $table->unsignedSmallInteger('passenger_count');
            $table->text('passenger_details')->nullable();

            // Vehicle and Driver (chosen from the dropdowns, optional)
            $table->foreignId('vehicle_id')
                ->nullable()
                ->constrained('tbl_vehicles', 'vehicle_id')
                ->nullOnDelete();

            $table->foreignId('driver_id')
                ->nullable()
                ->constrained('tbl_drivers', 'driver_id')
                ->nullOnDelete();

            // Booking Status
            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
                'cancelled',
            ])->default('pending');

            // Approval Workflow
            $table->string('approval_stage', 100)
                ->default('office_head');

            $table->text('approval_remarks')->nullable();
            $table->text('cancellation_reason')->nullable();

            // Soft Delete
            $table->boolean('is_deleted')->default(false);

            $table->timestamps();

            // Indexes
            $table->index(['status', 'approval_stage', 'is_deleted']);
            $table->index(['office_id', 'status']);
            $table->index(['requested_by_user_id', 'status']);
            $table->index(
                ['vehicle_id', 'travel_date', 'expected_return_date'],
                'vehicle_bookings_vehicle_schedule_idx'
            );
            $table->index(
                ['driver_id', 'travel_date', 'expected_return_date'],
                'vehicle_bookings_driver_schedule_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_vehicle_bookings');
    }
};