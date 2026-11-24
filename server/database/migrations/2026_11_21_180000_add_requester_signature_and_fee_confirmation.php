<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_event_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_event_bookings', 'requester_signature_path')) {
                $table->string('requester_signature_path', 255)->nullable()->after('tel_number');
                $table->string('requester_signature_mime', 100)->nullable()->after('requester_signature_path');
                $table->string('requester_signer_name', 150)->nullable()->after('requester_signature_mime');
                $table->string('requester_signer_position', 150)->nullable()->after('requester_signer_name');
            }
        });

        Schema::table('tbl_event_booking_fee_snapshots', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_event_booking_fee_snapshots', 'calculation_confirmed_at')) {
                $table->timestamp('calculation_confirmed_at')->nullable()->after('calculated_at');
                $table->foreignId('calculation_confirmed_by')
                    ->nullable()
                    ->after('calculation_confirmed_at')
                    ->constrained('tbl_users', 'user_id')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('tbl_event_booking_fee_snapshots', function (Blueprint $table) {
            if (Schema::hasColumn('tbl_event_booking_fee_snapshots', 'calculation_confirmed_by')) {
                $table->dropConstrainedForeignId('calculation_confirmed_by');
            }
            if (Schema::hasColumn('tbl_event_booking_fee_snapshots', 'calculation_confirmed_at')) {
                $table->dropColumn('calculation_confirmed_at');
            }
        });

        Schema::table('tbl_event_bookings', function (Blueprint $table) {
            foreach ([
                'requester_signer_position',
                'requester_signer_name',
                'requester_signature_mime',
                'requester_signature_path',
            ] as $column) {
                if (Schema::hasColumn('tbl_event_bookings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
