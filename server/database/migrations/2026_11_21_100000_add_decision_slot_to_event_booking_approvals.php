<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('tbl_event_booking_approvals', 'decision_slot')) {
            Schema::table('tbl_event_booking_approvals', function (Blueprint $table) {
                $table->string('decision_slot', 50)->nullable()->after('approval_stage');
            });
        }

        // The old unique index also supports the booking foreign key on MySQL.
        // Add a plain booking index before that unique index is removed.
        $indexNames = collect(Schema::getIndexes('tbl_event_booking_approvals'))->pluck('name');

        if (!$indexNames->contains('event_booking_approvals_booking_idx')) {
            Schema::table('tbl_event_booking_approvals', function (Blueprint $table) {
                $table->index('event_booking_id', 'event_booking_approvals_booking_idx');
            });
        }

        if ($indexNames->contains('event_booking_stage_decision_unique')) {
            Schema::table('tbl_event_booking_approvals', function (Blueprint $table) {
                $table->dropUnique('event_booking_stage_decision_unique');
            });
        }

        $indexNames = collect(Schema::getIndexes('tbl_event_booking_approvals'))->pluck('name');

        if (!$indexNames->contains('event_booking_stage_slot_unique')) {
            Schema::table('tbl_event_booking_approvals', function (Blueprint $table) {
                $table->unique(
                    ['event_booking_id', 'approval_stage', 'decision_slot'],
                    'event_booking_stage_slot_unique'
                );
            });
        }
    }

    public function down(): void
    {
        $indexNames = collect(Schema::getIndexes('tbl_event_booking_approvals'))->pluck('name');

        if (!$indexNames->contains('event_booking_approvals_booking_idx')) {
            Schema::table('tbl_event_booking_approvals', function (Blueprint $table) {
                $table->index('event_booking_id', 'event_booking_approvals_booking_idx');
            });
        }

        if ($indexNames->contains('event_booking_stage_slot_unique')) {
            Schema::table('tbl_event_booking_approvals', function (Blueprint $table) {
                $table->dropUnique('event_booking_stage_slot_unique');
            });
        }

        $indexNames = collect(Schema::getIndexes('tbl_event_booking_approvals'))->pluck('name');

        if (!$indexNames->contains('event_booking_stage_decision_unique')) {
            Schema::table('tbl_event_booking_approvals', function (Blueprint $table) {
                $table->unique(
                    ['event_booking_id', 'approval_stage'],
                    'event_booking_stage_decision_unique'
                );
            });
        }

        if (Schema::hasColumn('tbl_event_booking_approvals', 'decision_slot')) {
            Schema::table('tbl_event_booking_approvals', function (Blueprint $table) {
                $table->dropColumn('decision_slot');
            });
        }
    }
};
