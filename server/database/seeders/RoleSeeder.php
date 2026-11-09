<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->systemRoles() as $role) {
            $existing = Role::query()
                ->where('slug', $role['slug'])
                ->first();

            if ($existing) {
                $existing->fill([
                    'name' => $role['name'],
                    'is_system_role' => true,
                ]);

                if (blank($existing->description)) {
                    $existing->description = $role['description'];
                }

                $existing->save();

                continue;
            }

            Role::create([
                'name' => $role['name'],
                'slug' => $role['slug'],
                'description' => $role['description'],
                'status' => 'active',
                'is_system_role' => true,
                'is_deleted' => false,
            ]);
        }
    }

    /**
     * @return list<array{name: string, slug: string, description: string}>
     */
    private function systemRoles(): array
    {
        return [
            [
                'name' => 'Super Admin',
                'slug' => Role::SUPER_ADMIN,
                'description' => 'Manages the entire system, including roles and offices. May book with an explicit emergency bypass and provides the final approval step.',
            ],
            [
                'name' => 'Event Admin',
                'slug' => Role::EVENT_ADMIN,
                'description' => 'Manages venues and events. Approves the event-admin step. Cannot create bookings.',
            ],
            [
                'name' => 'Vehicle Admin',
                'slug' => Role::VEHICLE_ADMIN,
                'description' => 'Manages vehicles and drivers. Approves the vehicle-admin step. Cannot create bookings.',
            ],
            [
                'name' => 'Event Approval Admin',
                'slug' => Role::EVENT_APPROVAL_ADMIN,
                'description' => 'Approves assigned event-approval stages. Does not manage records or create bookings.',
            ],
            [
                'name' => 'Vehicle Approval Admin',
                'slug' => Role::VEHICLE_APPROVAL_ADMIN,
                'description' => 'Approves assigned vehicle-approval stages. Does not manage records or create bookings.',
            ],
            [
                'name' => 'Dean / Office Head',
                'slug' => Role::DEAN_OFFICE_HEAD,
                'description' => 'Manages users in their own office. Provides step-1 approval for that office. Booking is optional and must be granted per user.',
            ],
            [
                'name' => 'Faculty/Staff',
                'slug' => Role::FACULTY_STAFF,
                'description' => 'May book events and vehicles. Can track their own approval requests. Cannot approve others.',
            ],
            [
                'name' => 'Student Republic',
                'slug' => Role::STUDENT_REPUBLIC,
                'description' => 'May book events only. Can track their own event approval requests. Cannot approve others.',
            ],
        ];
    }
}
