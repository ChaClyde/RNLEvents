<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tbl_roles')
            ->whereIn('slug', ['business-manager', 'vp-finance'])
            ->update([
                'status' => 'inactive',
                'is_system_role' => false,
                'is_deleted' => true,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('tbl_roles')
            ->whereIn('slug', ['business-manager', 'vp-finance'])
            ->update([
                'status' => 'active',
                'is_system_role' => true,
                'is_deleted' => false,
                'updated_at' => now(),
            ]);
    }
};
