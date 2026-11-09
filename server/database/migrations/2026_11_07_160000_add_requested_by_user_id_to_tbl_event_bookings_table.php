<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_event_bookings', function (Blueprint $table) {
            $table->foreignId('requested_by_user_id')
                ->nullable()
                ->after('requested_by')
                ->constrained('tbl_users', 'user_id')
                ->nullOnDelete();

            $table->index('requested_by_user_id');
        });

        // Evidence-based backfill only: exact email match to an existing user.
        // Unmatched historical rows stay null and must be assigned manually.
        $bookingEmails = DB::table('tbl_event_bookings')
            ->whereNull('requested_by_user_id')
            ->pluck('email', 'event_booking_id');

        foreach ($bookingEmails as $bookingId => $email) {
            $userId = DB::table('tbl_users')
                ->where('email', $email)
                ->where('is_deleted', false)
                ->value('user_id');

            if ($userId) {
                DB::table('tbl_event_bookings')
                    ->where('event_booking_id', $bookingId)
                    ->update(['requested_by_user_id' => $userId]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('tbl_event_bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('requested_by_user_id');
        });
    }
};
