<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_event_bookings', function (Blueprint $table) {
            $table->id('event_booking_id');

            // Venue
            $table->foreignId('venue_id')
                ->constrained('tbl_venues', 'venue_id')
                ->restrictOnDelete();

            // Event Information
            $table->string('purpose', 200);
            $table->text('description')->nullable();

            // Schedule
            $table->date('date_start');
            $table->date('date_end');
            $table->time('time_start');
            $table->time('time_end');
            $table->unsignedInteger('number_of_days')->default(1);

            // Participants
            $table->unsignedInteger('expected_attendees')->default(0);

            // Requestor
            $table->string('requested_by', 150);

            $table->foreignId('office_id')
                ->constrained('tbl_offices', 'office_id')
                ->restrictOnDelete();

            $table->string('email', 150);
            $table->string('tel_number', 30);

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
            $table->index(['venue_id', 'date_start', 'date_end']);
            $table->index(['status', 'is_deleted']);
            $table->index(['office_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_event_bookings');
    }
};
