<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('tbl_drivers', 'license_expiry')) {
            Schema::table('tbl_drivers', function (Blueprint $table) {
                $table->date('license_expiry')->nullable()->after('email');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('tbl_drivers', 'license_expiry')) {
            Schema::table('tbl_drivers', function (Blueprint $table) {
                $table->dropColumn('license_expiry');
            });
        }
    }
};
