<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tbl_event_booking_attachments')) {
            return;
        }

        $exists = collect(Schema::getIndexes('tbl_event_booking_attachments'))
            ->contains(fn (array $index) => ($index['name'] ?? '') === 'eba_booking_type_unique');

        if ($exists) {
            return;
        }

        Schema::table('tbl_event_booking_attachments', function (Blueprint $table) {
            $table->unique(
                ['event_booking_id', 'attachment_type'],
                'eba_booking_type_unique'
            );
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('tbl_event_booking_attachments')) {
            return;
        }

        $exists = collect(Schema::getIndexes('tbl_event_booking_attachments'))
            ->contains(fn (array $index) => ($index['name'] ?? '') === 'eba_booking_type_unique');

        if (!$exists) {
            return;
        }

        Schema::table('tbl_event_booking_attachments', function (Blueprint $table) {
            $table->dropUnique('eba_booking_type_unique');
        });
    }
};
