<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_vehicle_booking_approvals', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_vehicle_booking_approvals', 'signature_path')) {
                $table->string('signature_path', 255)->nullable()->after('remarks');
            }
            if (!Schema::hasColumn('tbl_vehicle_booking_approvals', 'signature_mime')) {
                $table->string('signature_mime', 100)->nullable()->after('signature_path');
            }
            if (!Schema::hasColumn('tbl_vehicle_booking_approvals', 'signer_name')) {
                $table->string('signer_name', 200)->nullable()->after('signature_mime');
            }
            if (!Schema::hasColumn('tbl_vehicle_booking_approvals', 'signer_position')) {
                $table->string('signer_position', 150)->nullable()->after('signer_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tbl_vehicle_booking_approvals', function (Blueprint $table) {
            foreach (['signer_position', 'signer_name', 'signature_mime', 'signature_path'] as $column) {
                if (Schema::hasColumn('tbl_vehicle_booking_approvals', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
