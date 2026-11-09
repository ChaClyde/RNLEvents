<?php

namespace Tests\Feature\Rbac;

use App\Models\Driver;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Models\VehicleBookingApproval;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class VehicleBookingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Office $officeA;
    private Office $officeB;
    private Vehicle $vehicle;
    private Driver $driver;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->officeA = Office::create([
            'office_code' => 'VB-A',
            'office_name' => 'Vehicle Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->officeB = Office::create([
            'office_code' => 'VB-B',
            'office_name' => 'Vehicle Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->vehicle = $this->makeVehicle('Van One', 'VAN-001');
        $this->driver = $this->makeDriver('Driver One');

        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        $this->users['faculty-b'] = $this->userFor(Role::FACULTY_STAFF, $this->officeB, 'faculty-b');
        $this->users['dean-b'] = $this->userFor(Role::DEAN_OFFICE_HEAD, $this->officeB, 'dean-b');
    }

    #[DataProvider('unauthorizedApproversProvider')]
    public function test_unauthorized_roles_cannot_approve_at_office_head(string $slug): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole($slug)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
                'approval_stage' => ApprovalStage::SUPER_ADMIN,
                'approved_by_user_id' => $this->users[Role::SUPER_ADMIN]->user_id,
            ])
            ->assertForbidden();

        $this->assertSame('pending', $booking->fresh()->status);
        $this->assertSame(ApprovalStage::OFFICE_HEAD, $booking->fresh()->approval_stage);
    }

    public static function unauthorizedApproversProvider(): array
    {
        return [
            'super-admin' => [Role::SUPER_ADMIN],
            'event-admin' => [Role::EVENT_ADMIN],
            'vehicle-admin' => [Role::VEHICLE_ADMIN],
            'event-approval-admin' => [Role::EVENT_APPROVAL_ADMIN],
            'vehicle-approval-admin' => [Role::VEHICLE_APPROVAL_ADMIN],
            'faculty-staff' => [Role::FACULTY_STAFF],
            'student-republic' => [Role::STUDENT_REPUBLIC],
        ];
    }

    public function test_student_republic_is_denied_vehicle_booking_access(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole(Role::STUDENT_REPUBLIC)
            ->getJson('/api/vehicle-bookings')
            ->assertForbidden();

        $this->asRole(Role::STUDENT_REPUBLIC)
            ->postJson('/api/vehicle-bookings/storeVehicleBooking', $this->requestPayload())
            ->assertForbidden();

        $this->asRole(Role::STUDENT_REPUBLIC)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();
    }

    public function test_faculty_submit_ignores_spoofed_requester_and_stage(): void
    {
        $created = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/vehicle-bookings/storeVehicleBooking', $this->requestPayload([
                'requested_by_user_id' => $this->users[Role::SUPER_ADMIN]->user_id,
                'office_id' => $this->officeB->office_id,
                'approval_stage' => ApprovalStage::SUPER_ADMIN,
                'status' => 'approved',
                'vehicle_id' => $this->vehicle->vehicle_id,
                'driver_id' => $this->driver->driver_id,
            ]))
            ->assertCreated()
            ->json('data');

        $this->assertSame($this->users[Role::FACULTY_STAFF]->user_id, $created['requested_by_user_id']);
        $this->assertSame($this->officeA->office_id, $created['office_id']);
        $this->assertSame('pending', $created['status']);
        $this->assertSame(ApprovalStage::OFFICE_HEAD, $created['approval_stage']);
        $this->assertNull($created['vehicle_id']);
        $this->assertNull($created['driver_id']);
    }

    public function test_sequential_approval_requires_assignment_before_final_approve(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
                'approval_stage' => ApprovalStage::SUPER_ADMIN,
                'approved_by' => $this->users[Role::SUPER_ADMIN]->user_id,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.approval_stage', ApprovalStage::VEHICLE_APPROVAL);

        $this->asRole(Role::VEHICLE_APPROVAL_ADMIN)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('data.approval_stage', ApprovalStage::VEHICLE_ADMIN);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertStatus(422);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $booking->vehicle_booking_id, [
                'vehicle_id' => $this->vehicle->vehicle_id,
                'driver_id' => $this->driver->driver_id,
            ])
            ->assertOk()
            ->assertJsonPath('data.vehicle_id', $this->vehicle->vehicle_id)
            ->assertJsonPath('data.driver_id', $this->driver->driver_id);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.approval_stage', ApprovalStage::SUPER_ADMIN);

        $this->asRole(Role::SUPER_ADMIN)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
                'approval_remarks' => 'Final review complete',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.approval_stage', ApprovalStage::SUPER_ADMIN);

        $history = $booking->fresh()->approvals;
        $this->assertCount(4, $history);
        $this->assertEquals(
            ApprovalStage::vehiclePipeline(),
            $history->pluck('approval_stage')->all(),
        );
        $this->assertTrue($history->every(
            fn (VehicleBookingApproval $row) => $row->action === VehicleBookingApproval::ACTION_APPROVED
        ));
    }

    public function test_stage_skipping_duplicate_approvals_and_emergency_bypass_are_rejected(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole(Role::VEHICLE_APPROVAL_ADMIN)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk();

        $booking->refresh()->update(['approval_stage' => ApprovalStage::OFFICE_HEAD]);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertStatus(422);

        $booking->update(['approval_stage' => ApprovalStage::VEHICLE_APPROVAL]);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $this->asRole(Role::SUPER_ADMIN)
            ->withHeaders(['X-Emergency-Bypass' => '1'])
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
                'emergency_bypass' => true,
            ])
            ->assertForbidden();

        $this->assertSame(ApprovalStage::VEHICLE_APPROVAL, $booking->fresh()->approval_stage);
        $this->assertSame('pending', $booking->fresh()->status);
        $this->assertCount(1, $booking->fresh()->approvals);
    }

    public function test_dean_cannot_approve_another_office_booking(): void
    {
        $foreign = $this->makeBooking($this->users['faculty-b']);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $foreign->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $this->actingAs($this->users['dean-b'], 'web')
            ->putJson('/api/vehicle-bookings/updateStatus/' . $foreign->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('data.approval_stage', ApprovalStage::VEHICLE_APPROVAL);
    }

    public function test_faculty_cannot_view_another_requesters_booking(): void
    {
        $other = $this->makeBooking($this->users['faculty-b']);

        $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/vehicle-bookings/' . $other->vehicle_booking_id)
            ->assertForbidden();

        $own = $this->makeBooking($this->users[Role::FACULTY_STAFF], '11:00', '12:00');

        $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/vehicle-bookings/' . $own->vehicle_booking_id)
            ->assertOk();
    }

    public function test_rejection_at_each_stage_records_history_and_stops_the_pipeline(): void
    {
        foreach (ApprovalStage::vehiclePipeline() as $index => $stage) {
            $booking = $this->makeBooking(
                $this->users[Role::FACULTY_STAFF],
                sprintf('%02d:00', 8 + $index),
                sprintf('%02d:30', 8 + $index),
            );

            $this->advanceToStage($booking, $stage);

            $actor = match ($stage) {
                ApprovalStage::OFFICE_HEAD => Role::DEAN_OFFICE_HEAD,
                ApprovalStage::VEHICLE_APPROVAL => Role::VEHICLE_APPROVAL_ADMIN,
                ApprovalStage::VEHICLE_ADMIN => Role::VEHICLE_ADMIN,
                default => Role::SUPER_ADMIN,
            };

            $this->asRole($actor)
                ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                    'status' => 'rejected',
                    'approval_remarks' => 'Needs revision at ' . $stage,
                    'approver_user_id' => $this->users[Role::SUPER_ADMIN]->user_id,
                ])
                ->assertOk()
                ->assertJsonPath('data.status', 'rejected')
                ->assertJsonPath('data.approval_stage', $stage);

            $this->asRole(Role::SUPER_ADMIN)
                ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                    'status' => 'approved',
                ])
                ->assertStatus(422);

            $this->assertSame(
                VehicleBookingApproval::ACTION_REJECTED,
                $booking->fresh()->approvals->last()->action,
            );
        }
    }

    public function test_requester_can_cancel_own_pending_booking_and_cannot_cancel_another(): void
    {
        $own = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $other = $this->makeBooking($this->users['faculty-b'], '14:00', '15:00');

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $own->vehicle_booking_id, [
                'status' => 'cancelled',
                'cancellation_reason' => 'Schedule conflict',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $other->vehicle_booking_id, [
                'status' => 'cancelled',
                'cancellation_reason' => 'Not mine',
            ])
            ->assertForbidden();
    }

    public function test_unreviewed_bookings_can_be_edited_but_in_pipeline_bookings_cannot(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $payload = $this->requestPayload(['purpose' => 'Updated trip']);

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/vehicle-bookings/updateVehicleBooking/' . $booking->vehicle_booking_id, $payload)
            ->assertOk()
            ->assertJsonPath('data.purpose', 'Updated trip');

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk();

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/vehicle-bookings/updateVehicleBooking/' . $booking->vehicle_booking_id, $payload)
            ->assertStatus(422);
    }

    public function test_assignment_is_blocked_until_vehicle_admin_stage(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $booking->vehicle_booking_id, [
                'vehicle_id' => $this->vehicle->vehicle_id,
                'driver_id' => $this->driver->driver_id,
            ])
            ->assertForbidden();

        $this->advanceToStage($booking, ApprovalStage::VEHICLE_ADMIN);

        $this->asRole(Role::FACULTY_STAFF)
            ->putJson('/api/vehicle-bookings/assign/' . $booking->vehicle_booking_id, [
                'vehicle_id' => $this->vehicle->vehicle_id,
                'driver_id' => $this->driver->driver_id,
            ])
            ->assertForbidden();
    }

    public function test_maintenance_unavailable_capacity_and_schedule_conflicts_are_rejected(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $this->advanceToStage($booking, ApprovalStage::VEHICLE_ADMIN);

        $maintenance = $this->makeVehicle('Shop Van', 'VAN-MNT', status: 'maintenance');
        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $booking->vehicle_booking_id, [
                'vehicle_id' => $maintenance->vehicle_id,
                'driver_id' => $this->driver->driver_id,
            ])
            ->assertStatus(422);

        $unavailable = $this->makeVehicle('Parked Van', 'VAN-UNV', status: 'unavailable');
        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $booking->vehicle_booking_id, [
                'vehicle_id' => $unavailable->vehicle_id,
                'driver_id' => $this->driver->driver_id,
            ])
            ->assertStatus(422);

        $small = $this->makeVehicle('Car', 'CAR-001', capacity: 2);
        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $booking->vehicle_booking_id, [
                'vehicle_id' => $small->vehicle_id,
                'driver_id' => $this->driver->driver_id,
            ])
            ->assertStatus(422);

        $onLeave = $this->makeDriver('Leave Driver', [
            'driver_status' => 'Sick Leave',
            'status_remarks' => 'Medical certificate on file',
            'status_start_date' => now()->toDateString(),
            'status_end_date' => now()->addDay()->toDateString(),
        ]);
        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $booking->vehicle_booking_id, [
                'vehicle_id' => $this->vehicle->vehicle_id,
                'driver_id' => $onLeave->driver_id,
            ])
            ->assertStatus(422)
            ->assertJsonPath(
                'errors.driver_id.0',
                'This driver is unavailable (Sick Leave): Medical certificate on file.',
            );

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $booking->vehicle_booking_id, [
                'vehicle_id' => $this->vehicle->vehicle_id,
                'driver_id' => $this->driver->driver_id,
            ])
            ->assertOk();

        $conflict = $this->makeBooking($this->users[Role::FACULTY_STAFF], '09:30', '11:00');
        $conflict->update(['approval_stage' => ApprovalStage::VEHICLE_ADMIN]);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $conflict->vehicle_booking_id, [
                'vehicle_id' => $this->vehicle->vehicle_id,
                'driver_id' => $this->makeDriver('Second Driver')->driver_id,
            ])
            ->assertStatus(422);

        $this->asRole(Role::VEHICLE_ADMIN)
            ->putJson('/api/vehicle-bookings/assign/' . $conflict->vehicle_booking_id, [
                'vehicle_id' => $this->makeVehicle('Van Two', 'VAN-002')->vehicle_id,
                'driver_id' => $this->driver->driver_id,
            ])
            ->assertStatus(422);
    }

    public function test_eight_roles_list_access_matches_catalog(): void
    {
        $allowed = [
            Role::SUPER_ADMIN,
            Role::VEHICLE_ADMIN,
            Role::VEHICLE_APPROVAL_ADMIN,
            Role::DEAN_OFFICE_HEAD,
            Role::FACULTY_STAFF,
        ];
        $denied = [
            Role::EVENT_ADMIN,
            Role::EVENT_APPROVAL_ADMIN,
            Role::STUDENT_REPUBLIC,
        ];

        foreach ($allowed as $slug) {
            $this->asRole($slug)->getJson('/api/vehicle-bookings')->assertOk();
        }

        foreach ($denied as $slug) {
            $this->asRole($slug)->getJson('/api/vehicle-bookings')->assertForbidden();
        }
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function requestPayload(array $overrides = []): array
    {
        $faculty = $this->users[Role::FACULTY_STAFF];

        return array_merge([
            'destination' => 'City Hall',
            'purpose' => 'Official errand',
            'travel_date' => now()->toDateString(),
            'expected_return_date' => now()->toDateString(),
            'departure_time' => '09:00',
            'expected_return_time' => '10:00',
            'passenger_count' => 4,
            'requested_by' => $faculty->first_name . ' ' . $faculty->last_name,
            'office_id' => $this->officeA->office_id,
            'email' => $faculty->email,
            'tel_number' => '1234567',
        ], $overrides);
    }

    private function advanceToStage(VehicleBooking $booking, string $target): void
    {
        $sequence = [
            ApprovalStage::OFFICE_HEAD => Role::DEAN_OFFICE_HEAD,
            ApprovalStage::VEHICLE_APPROVAL => Role::VEHICLE_APPROVAL_ADMIN,
            ApprovalStage::VEHICLE_ADMIN => Role::VEHICLE_ADMIN,
            ApprovalStage::SUPER_ADMIN => Role::SUPER_ADMIN,
        ];

        foreach ($sequence as $stage => $role) {
            if ($booking->fresh()->approval_stage === $target) {
                return;
            }

            if ($stage === ApprovalStage::VEHICLE_ADMIN) {
                $this->asRole(Role::VEHICLE_ADMIN)
                    ->putJson('/api/vehicle-bookings/assign/' . $booking->vehicle_booking_id, [
                        'vehicle_id' => $booking->vehicle_id ?: $this->vehicle->vehicle_id,
                        'driver_id' => $booking->driver_id ?: $this->driver->driver_id,
                    ])
                    ->assertOk();
            }

            $this->asRole($role)
                ->putJson('/api/vehicle-bookings/updateStatus/' . $booking->vehicle_booking_id, [
                    'status' => 'approved',
                ])
                ->assertOk();
        }
    }

    private function asRole(string $slug)
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        return $this->actingAs($this->users[$slug], 'web');
    }

    private function userFor(string $slug, ?Office $office = null, ?string $key = null): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();
        $office ??= $this->officeA;
        $suffix = $key ?? $slug . '-' . uniqid();

        return User::create([
            'first_name' => 'Flow',
            'last_name' => $slug,
            'email' => $suffix . '@example.com',
            'username' => $suffix,
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }

    private function makeVehicle(
        string $name,
        string $plate,
        int $capacity = 12,
        string $status = 'available',
    ): Vehicle {
        return Vehicle::create([
            'vehicle_name' => $name,
            'plate_number' => $plate,
            'capacity' => $capacity,
            'status' => $status,
            'is_deleted' => false,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeDriver(string $name, array $overrides = []): Driver
    {
        return Driver::create(array_merge([
            'driver_name' => $name,
            'driver_status' => 'Available',
            'is_deleted' => false,
        ], $overrides));
    }

    private function makeBooking(User $owner, string $start = '09:00', string $end = '10:00'): VehicleBooking
    {
        return VehicleBooking::create([
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'requested_by' => $owner->first_name . ' ' . $owner->last_name,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'destination' => 'City Hall',
            'purpose' => 'Workflow trip',
            'travel_date' => now()->toDateString(),
            'departure_time' => $start,
            'expected_return_date' => now()->toDateString(),
            'expected_return_time' => $end,
            'passenger_count' => 4,
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ]);
    }
}
