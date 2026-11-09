<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class SuperAdminSeeder extends Seeder
{
    public const USERNAME = 'filsched.superadmin';

    public const EMAIL = 'superadmin@filsched.local';

    public function run(): void
    {
        $password = trim((string) env('FILSCHED_SUPERADMIN_PASSWORD', ''));

        if ($password === '') {
            throw new RuntimeException(
                'FILSCHED_SUPERADMIN_PASSWORD is missing. Set it in the environment before seeding the local Super Admin account.'
            );
        }

        $role = Role::query()
            ->where('slug', Role::SUPER_ADMIN)
            ->where('is_deleted', false)
            ->first();

        if ($role === null) {
            throw new RuntimeException(
                'The Super Admin system role was not found. Run RoleSeeder before SuperAdminSeeder.'
            );
        }

        $matches = User::query()
            ->where(function ($query) {
                $query->where('username', self::USERNAME)
                    ->orWhere('email', self::EMAIL);
            })
            ->get();

        foreach ($matches as $match) {
            if ($this->isProtectedAccount($match)) {
                throw new RuntimeException(
                    'Refusing to modify a protected account while seeding the local Super Admin user.'
                );
            }
        }

        if ($matches->count() > 1) {
            throw new RuntimeException(
                'Username filsched.superadmin and email superadmin@filsched.local belong to different accounts. Resolve this before seeding.'
            );
        }

        $user = $matches->first();
        $office = $this->testingOffice();

        if ($user) {
            $user->fill([
                'first_name' => 'FilSched',
                'last_name' => 'SuperAdmin',
                'email' => self::EMAIL,
                'username' => self::USERNAME,
                'office_id' => $user->office_id ?: $office->office_id,
                'role_id' => $role->role_id,
                'account_status' => 'Active',
                'is_deleted' => false,
            ]);
            $user->save();

            return;
        }

        User::create([
            'first_name' => 'FilSched',
            'last_name' => 'SuperAdmin',
            'email' => self::EMAIL,
            'username' => self::USERNAME,
            'password' => $password,
            'position' => 'Super Administrator',
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'must_change_password' => false,
            'is_deleted' => false,
        ]);
    }

    private function testingOffice(): Office
    {
        $existing = Office::query()
            ->where('is_deleted', false)
            ->orderBy('office_id')
            ->first();

        if ($existing) {
            return $existing;
        }

        return Office::query()->firstOrCreate(
            ['office_code' => 'FILSCHED-SA'],
            [
                'office_name' => 'FilSched Administration',
                'office_type' => 'Administration',
                'description' => 'Local development office for the FilSched Super Admin testing account.',
                'status' => 'active',
                'is_deleted' => false,
            ]
        );
    }

    private function isProtectedAccount(User $user): bool
    {
        $username = strtolower((string) $user->username);
        $email = strtolower((string) $user->email);
        $fullName = strtolower(trim($user->first_name.' '.$user->last_name));

        return str_contains($username, 'chaclyde')
            || str_contains($email, 'chaclyde')
            || str_contains($fullName, 'chaclyde');
    }
}
