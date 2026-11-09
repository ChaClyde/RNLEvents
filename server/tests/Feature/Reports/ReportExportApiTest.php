<?php

namespace Tests\Feature\Reports;

use App\Models\Driver;
use App\Models\EventBooking;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Models\Venue;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class ReportExportApiTest extends TestCase
{
    use RefreshDatabase;

    private Office $officeA;
    private Office $officeB;
    private Venue $hallA;
    private Venue $hallB;
    private Vehicle $vanA;
    private Vehicle $vanB;
    private Driver $driverA;
    private Driver $driverB;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->officeA = Office::create([
            'office_code' => 'XR-A',
            'office_name' => 'Export Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->officeB = Office::create([
            'office_code' => 'XR-B',
            'office_name' => 'Export Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->hallA = Venue::create([
            'venue' => 'Export Hall A',
            'capacity' => 40,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);
        $this->hallB = Venue::create([
            'venue' => 'Export Hall B',
            'capacity' => 20,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);
        $this->vanA = Vehicle::create([
            'vehicle_name' => 'Export Van A',
            'plate_number' => 'XR-AAA',
            'capacity' => 12,
            'status' => 'available',
            'is_deleted' => false,
        ]);
        $this->vanB = Vehicle::create([
            'vehicle_name' => 'Export Van B',
            'plate_number' => 'XR-BBB',
            'capacity' => 8,
            'status' => 'maintenance',
            'is_deleted' => false,
        ]);
        $this->driverA = Driver::create([
            'driver_name' => 'Export Driver A',
            'driver_status' => 'Available',
            'license_expiry' => now()->addMonths(8)->toDateString(),
            'is_deleted' => false,
        ]);
        $this->driverB = Driver::create([
            'driver_name' => 'Export Driver B',
            'driver_status' => 'On Leave',
            'contact_number' => '09998887777',
            'email' => 'secret-driver@example.com',
            'license_number' => 'SECRET-LIC-999',
            'status_remarks' => 'Medical leave',
            'status_start_date' => now()->toDateString(),
            'status_end_date' => now()->addDays(5)->toDateString(),
            'license_expiry' => now()->subDays(2)->toDateString(),
            'is_deleted' => false,
        ]);

        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        $this->users['faculty-b'] = $this->userFor(Role::FACULTY_STAFF, $this->officeB, 'faculty-b');
    }

    public function test_pdf_and_excel_exports_require_authentication(): void
    {
        $this->getJson('/api/reports/events/export/pdf')->assertUnauthorized();
        $this->getJson('/api/reports/events/export/excel')->assertUnauthorized();
        $this->getJson('/api/reports/vehicles/export/pdf')->assertUnauthorized();
        $this->getJson('/api/reports/vehicles/export/excel')->assertUnauthorized();
    }

    public function test_unauthorized_roles_cannot_export_reports(): void
    {
        foreach ([Role::FACULTY_STAFF, Role::STUDENT_REPUBLIC] as $slug) {
            $this->asRole($slug)->get('/api/reports/events/export/pdf')->assertForbidden();
            $this->asRole($slug)->get('/api/reports/events/export/excel')->assertForbidden();
            $this->asRole($slug)->get('/api/reports/vehicles/export/pdf')->assertForbidden();
            $this->asRole($slug)->get('/api/reports/vehicles/export/excel')->assertForbidden();
        }

        $this->asRole(Role::VEHICLE_ADMIN)->get('/api/reports/events/export/pdf')->assertForbidden();
        $this->asRole(Role::EVENT_ADMIN)->get('/api/reports/vehicles/export/excel')->assertForbidden();
    }

    public function test_event_admin_can_export_pdf_and_excel(): void
    {
        $this->seedEventBookings();
        $date = now()->format('Y-m-d');

        $pdf = $this->asRole(Role::EVENT_ADMIN)->get('/api/reports/events/export/pdf');
        $pdf->assertOk();
        $pdf->assertHeader('content-type', 'application/pdf');
        $this->assertStringContainsString(
            'filename="FilSched-Event-Report-'.$date.'.pdf"',
            (string) $pdf->headers->get('content-disposition')
        );
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
        $this->assertStringNotContainsString('@example.com', $pdf->getContent());
        $this->assertStringNotContainsString('1234567', $pdf->getContent());

        $excel = $this->asRole(Role::EVENT_ADMIN)->get('/api/reports/events/export/excel');
        $excel->assertOk();
        $excel->assertDownload('FilSched-Event-Report-'.$date.'.xlsx');
        $this->assertStringContainsString(
            'spreadsheetml.sheet',
            (string) $excel->headers->get('content-type')
        );

        $sheet = IOFactory::load($excel->getFile()->getPathname())->getSheetByName('Event Bookings');
        $this->assertSame(7, $sheet->getHighestDataRow());
        $values = $this->sheetValues($sheet);
        $this->assertStringContainsString('Alpha pending', $values);
        $this->assertStringNotContainsString('@example.com', $values);
        $this->assertStringNotContainsString('1234567', $values);
    }

    public function test_vehicle_admin_can_export_pdf_and_excel(): void
    {
        $this->seedVehicleBookings();
        $date = now()->format('Y-m-d');

        $pdf = $this->asRole(Role::VEHICLE_ADMIN)->get('/api/reports/vehicles/export/pdf');
        $pdf->assertOk();
        $pdf->assertHeader('content-type', 'application/pdf');
        $this->assertStringContainsString(
            'filename="FilSched-Vehicle-Report-'.$date.'.pdf"',
            (string) $pdf->headers->get('content-disposition')
        );
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
        $this->assertStringNotContainsString('SECRET-LIC-999', $pdf->getContent());
        $this->assertStringNotContainsString('09998887777', $pdf->getContent());
        $this->assertStringNotContainsString('secret-driver@example.com', $pdf->getContent());

        $excel = $this->asRole(Role::VEHICLE_ADMIN)->get('/api/reports/vehicles/export/excel');
        $excel->assertOk();
        $excel->assertDownload('FilSched-Vehicle-Report-'.$date.'.xlsx');

        $workbook = IOFactory::load($excel->getFile()->getPathname());
        $this->assertNotNull($workbook->getSheetByName('Vehicle Bookings'));
        $this->assertNotNull($workbook->getSheetByName('Vehicle Utilization'));
        $this->assertNotNull($workbook->getSheetByName('Driver Reports'));
        $this->assertNotNull($workbook->getSheetByName('Office-Based Reports'));
        $values = $this->sheetValues($workbook->getSheetByName('Vehicle Bookings'))
            .$this->sheetValues($workbook->getSheetByName('Driver Leave'))
            .$this->sheetValues($workbook->getSheetByName('License Alerts'));
        $this->assertStringContainsString('Alpha pending', $values);
        $this->assertStringContainsString('Export Driver B', $values);
        $this->assertStringNotContainsString('SECRET-LIC-999', $values);
        $this->assertStringNotContainsString('09998887777', $values);
        $this->assertStringNotContainsString('secret-driver@example.com', $values);
        $this->assertStringNotContainsString('passenger_details', $values);
    }

    public function test_dean_event_export_is_office_isolated(): void
    {
        $this->seedEventBookings();

        $excel = $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->get('/api/reports/events/export/excel?office_id='.$this->officeB->office_id)
            ->assertOk();

        $sheet = IOFactory::load($excel->getFile()->getPathname())->getSheetByName('Event Bookings');
        $values = $this->sheetValues($sheet);

        $this->assertStringContainsString('Alpha pending', $values);
        $this->assertStringNotContainsString('Bravo approved', $values);
        $this->assertSame(5, $sheet->getHighestDataRow());
    }

    public function test_dean_vehicle_export_is_office_isolated(): void
    {
        $this->seedVehicleBookings();

        $excel = $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->get('/api/reports/vehicles/export/excel?office_id='.$this->officeB->office_id)
            ->assertOk();

        $values = $this->sheetValues(
            IOFactory::load($excel->getFile()->getPathname())->getSheetByName('Vehicle Bookings')
        );

        $this->assertStringContainsString('Alpha pending', $values);
        $this->assertStringNotContainsString('Bravo approved', $values);
    }

    public function test_event_export_includes_all_matching_records_not_one_page(): void
    {
        for ($i = 1; $i <= 12; $i++) {
            $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
                'purpose' => 'Paged event '.$i,
            ]);
        }

        $page = $this->asRole(Role::SUPER_ADMIN)
            ->getJson('/api/reports/events/bookings?per_page=1&page=1')
            ->assertOk();
        $this->assertCount(1, $page->json('data'));
        $this->assertSame(12, $page->json('meta.total'));

        $excel = $this->asRole(Role::SUPER_ADMIN)
            ->get('/api/reports/events/export/excel?per_page=1&page=1')
            ->assertOk();

        $this->assertSame(
            13,
            IOFactory::load($excel->getFile()->getPathname())->getSheetByName('Event Bookings')->getHighestDataRow()
        );
    }

    public function test_vehicle_export_respects_combined_filters_and_excludes_soft_deleted(): void
    {
        $this->seedVehicleBookings();
        $this->makeVehicleBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Trashed trip',
            'status' => 'approved',
            'is_deleted' => true,
            'vehicle_id' => $this->vanA->vehicle_id,
        ]);

        $excel = $this->asRole(Role::VEHICLE_ADMIN)
            ->get('/api/reports/vehicles/export/excel?start_date='.now()->toDateString().'&end_date='.now()->toDateString().'&status=approved&vehicle_id='.$this->vanA->vehicle_id)
            ->assertOk();

        $sheet = IOFactory::load($excel->getFile()->getPathname())->getSheetByName('Vehicle Bookings');
        $values = $this->sheetValues($sheet);
        $this->assertSame(2, $sheet->getHighestDataRow());
        $this->assertStringContainsString('Alpha approved today', $values);
        $this->assertStringNotContainsString('Trashed trip', $values);
        $this->assertStringNotContainsString('Bravo approved', $values);
    }

    public function test_event_export_respects_combined_filters_and_excludes_soft_deleted(): void
    {
        $this->seedEventBookings();
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Trashed event',
            'status' => 'approved',
            'is_deleted' => true,
        ]);

        $excel = $this->asRole(Role::EVENT_ADMIN)
            ->get('/api/reports/events/export/excel?start_date='.now()->toDateString().'&end_date='.now()->toDateString().'&status=approved&venue_id='.$this->hallA->venue_id)
            ->assertOk();

        $sheet = IOFactory::load($excel->getFile()->getPathname())->getSheetByName('Event Bookings');
        $values = $this->sheetValues($sheet);
        $this->assertSame(2, $sheet->getHighestDataRow());
        $this->assertStringContainsString('Alpha approved today', $values);
        $this->assertStringNotContainsString('Trashed event', $values);
        $this->assertStringNotContainsString('Bravo approved', $values);
    }

    private function sheetValues($sheet): string
    {
        $values = [];

        foreach ($sheet->toArray() as $row) {
            foreach ($row as $cell) {
                $values[] = (string) $cell;
            }
        }

        return implode(' | ', $values);
    }

    private function seedEventBookings(): void
    {
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha pending',
            'status' => 'pending',
            'venue_id' => $this->hallA->venue_id,
        ]);
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha approved today',
            'status' => 'approved',
            'venue_id' => $this->hallA->venue_id,
        ]);
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha completed',
            'status' => 'approved',
            'venue_id' => $this->hallB->venue_id,
            'date_start' => now()->subDays(10)->toDateString(),
            'date_end' => now()->subDays(8)->toDateString(),
        ]);
        $this->makeEventBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha cancelled',
            'status' => 'cancelled',
        ]);
        $this->makeEventBooking($this->users['faculty-b'], [
            'purpose' => 'Bravo approved',
            'status' => 'approved',
            'venue_id' => $this->hallB->venue_id,
        ]);
        $this->makeEventBooking($this->users['faculty-b'], [
            'purpose' => 'Bravo rejected',
            'status' => 'rejected',
            'venue_id' => $this->hallB->venue_id,
        ]);
    }

    private function seedVehicleBookings(): void
    {
        $this->makeVehicleBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha pending',
            'status' => 'pending',
            'vehicle_id' => $this->vanA->vehicle_id,
            'driver_id' => $this->driverA->driver_id,
        ]);
        $this->makeVehicleBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha approved today',
            'status' => 'approved',
            'vehicle_id' => $this->vanA->vehicle_id,
            'driver_id' => $this->driverA->driver_id,
        ]);
        $this->makeVehicleBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha completed',
            'status' => 'approved',
            'vehicle_id' => $this->vanA->vehicle_id,
            'driver_id' => $this->driverA->driver_id,
            'travel_date' => now()->subDays(10)->toDateString(),
            'expected_return_date' => now()->subDays(8)->toDateString(),
        ]);
        $this->makeVehicleBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha cancelled',
            'status' => 'cancelled',
            'vehicle_id' => $this->vanA->vehicle_id,
        ]);
        $this->makeVehicleBooking($this->users['faculty-b'], [
            'purpose' => 'Bravo approved',
            'status' => 'approved',
            'vehicle_id' => $this->vanB->vehicle_id,
            'destination' => 'City Hall',
        ]);
        $this->makeVehicleBooking($this->users['faculty-b'], [
            'purpose' => 'Bravo rejected',
            'status' => 'rejected',
            'vehicle_id' => $this->vanB->vehicle_id,
            'destination' => 'City Plaza',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeEventBooking(User $owner, array $overrides = []): EventBooking
    {
        return EventBooking::create(array_merge([
            'venue_id' => $this->hallA->venue_id,
            'purpose' => 'Report event',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '08:00:00',
            'time_end' => '10:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 10,
            'requested_by' => $owner->first_name.' '.$owner->last_name,
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ], $overrides));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeVehicleBooking(User $owner, array $overrides = []): VehicleBooking
    {
        return VehicleBooking::create(array_merge([
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'requested_by' => $owner->first_name.' '.$owner->last_name,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'destination' => 'Campus Gate',
            'purpose' => 'Report trip',
            'travel_date' => now()->toDateString(),
            'departure_time' => '09:00:00',
            'expected_return_date' => now()->toDateString(),
            'expected_return_time' => '12:00:00',
            'passenger_count' => 4,
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ], $overrides));
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
        $suffix = $key ?? $slug.'-'.uniqid();

        return User::create([
            'first_name' => 'Dash',
            'last_name' => $slug,
            'email' => $suffix.'@example.com',
            'username' => $suffix,
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load(['role', 'office']);
    }
}
