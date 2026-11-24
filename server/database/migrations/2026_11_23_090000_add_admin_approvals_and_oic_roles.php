<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        foreach ([
            [
                'name' => 'Admin Approvals',
                'slug' => 'admin-approvals',
                'description' => 'Approves the Admin Approvals step for event bookings and vehicle bookings.',
            ],
            [
                'name' => 'OIC, Accounting/Budget Office',
                'slug' => 'oic-budget',
                'description' => 'Confirms availability of funds after Admin Approvals on a vehicle booking.',
            ],
        ] as $role) {
            $exists = DB::table('tbl_roles')->where('slug', $role['slug'])->exists();
            if ($exists) {
                continue;
            }

            DB::table('tbl_roles')->insert($role + [
                'status' => 'active',
                'is_system_role' => true,
                'is_deleted' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $adminId = DB::table('tbl_roles')->where('slug', 'admin-approvals')->value('role_id');

        if ($adminId) {
            DB::table('tbl_users')
                ->whereIn('role_id', function ($query) {
                    $query->select('role_id')
                        ->from('tbl_roles')
                        ->whereIn('slug', ['event-approval-admin', 'vehicle-approval-admin']);
                })
                ->update([
                    'role_id' => $adminId,
                    'updated_at' => $now,
                ]);
        }

        DB::table('tbl_roles')
            ->whereIn('slug', ['event-approval-admin', 'vehicle-approval-admin'])
            ->update([
                'status' => 'inactive',
                'is_system_role' => false,
                'is_deleted' => true,
                'updated_at' => $now,
            ]);
    }

    public function down(): void
    {
        DB::table('tbl_roles')
            ->whereIn('slug', ['admin-approvals', 'oic-budget'])
            ->update([
                'status' => 'inactive',
                'is_system_role' => false,
                'is_deleted' => true,
                'updated_at' => now(),
            ]);
    }
};
