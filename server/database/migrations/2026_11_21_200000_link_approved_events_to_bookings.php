<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_events', function (Blueprint $table) {
            $table->foreignId('event_booking_id')
                ->nullable()
                ->unique()
                ->after('event_id')
                ->constrained('tbl_event_bookings', 'event_booking_id')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tbl_events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('event_booking_id');
        });
    }
};
