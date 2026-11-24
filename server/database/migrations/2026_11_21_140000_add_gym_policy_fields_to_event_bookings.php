<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_event_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_event_bookings', 'university_wide_activity')) {
                $table->boolean('university_wide_activity')->default(false);
                $table->foreignId('university_wide_designated_by')
                    ->nullable()
                    ->constrained('tbl_users', 'user_id')
                    ->nullOnDelete();
                $table->timestamp('university_wide_designated_at')->nullable();
                $table->string('reservation_span', 30)->nullable();
                $table->boolean('gym_responsibilities_acknowledged')->default(false);
                $table->timestamp('gym_responsibilities_acknowledged_at')->nullable();
                $table->foreignId('gym_responsibilities_acknowledged_by')
                    ->nullable()
                    ->constrained('tbl_users', 'user_id')
                    ->nullOnDelete();
                $table->text('gym_responsibility_statement')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('tbl_event_bookings', function (Blueprint $table) {
            if (Schema::hasColumn('tbl_event_bookings', 'university_wide_activity')) {
                $table->dropConstrainedForeignId('university_wide_designated_by');
                $table->dropConstrainedForeignId('gym_responsibilities_acknowledged_by');
                $table->dropColumn([
                    'university_wide_activity',
                    'university_wide_designated_at',
                    'reservation_span',
                    'gym_responsibilities_acknowledged',
                    'gym_responsibilities_acknowledged_at',
                    'gym_responsibility_statement',
                ]);
            }
        });
    }
};
