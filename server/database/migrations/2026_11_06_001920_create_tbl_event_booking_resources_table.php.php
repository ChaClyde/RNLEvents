<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_event_booking_resources', function (Blueprint $table) {
            $table->id('event_booking_resource_id');

            // Parent Booking
            $table->foreignId('event_booking_id')
                ->constrained('tbl_event_bookings', 'event_booking_id')
                ->cascadeOnDelete();

            // Linked venue resource.
            // NULL = "Other equipment" typed in by the requestor,
            // or the venue resource was deleted later.
            $table->foreignId('resource_id')
                ->nullable()
                ->constrained('tbl_venue_resources', 'resource_id')
                ->nullOnDelete();

            // Snapshot, so the booking still reads correctly
            // if the venue resource is renamed or deleted
            $table->string('resource_name', 100);

            $table->unsignedInteger('quantity')->default(1);

            $table->string('notes', 255)->nullable();

            $table->timestamps();

            // A venue resource can only be requested once per booking
            $table->unique(
                ['event_booking_id', 'resource_id'],
                'booking_resource_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_event_booking_resources');
    }
};
