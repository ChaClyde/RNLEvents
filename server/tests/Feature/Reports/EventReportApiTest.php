<?php

namespace Tests\Feature\Reports;

use App\Models\EventBooking;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EventReportApiTest extends TestCase
{
    use RefreshDatabase;

    private Office $officeA;
    private Office $officeB;
    private Venue $hallA;
    private Venue $hallB;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->officeA = Office::create([
            'office_code' => 'ER-A',
            'office_name' => 'Reports Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->officeB = Office::create([
            'office_code' => 'ER-B',
            'office_name' => 'Reports Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->hallA = Venue::create([
            'venue' => 'Alpha Hall',
            'capacity' => 40,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);
        $this->hallB = Venue::create([
            'venue' => 'Beta Hall',
            'capacity' => 20,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        foreach (Role::SYSTEM_SLUGS as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        $this->users['faculty-b'] = $this->userFor(Role::FACULTY_STAFF, $this->officeB, 'faculty-b');
        $this->users['dean-b'] = $this->userFor(Role::DEAN_OFFICE_HEAD, $this->officeB, 'dean-b');
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/reports/events/summary')->assertUnauthorized();
        $this->getJson('/api/reports/events/bookings')->assertUnauthorized();
    }

    public function test_super_admin_sees_system_wide_reports(): void
    {
        $this->seedBookings();

        $summary = $this->cards(
            $this->asRole(Role::SUPER_ADMIN)->getJson('/api/reports/events/summary')->assertOk()
        );

        $this->assertSame(6, $summary['total']);
        $this->assertSame(1, $summary['pending']);
        $this->assertSame(3, $summary['approved']);
        $this->assertSame(1, $summary['rejected']);
        $this->assertSame(1, $summary['cancelled']);
        $this->assertSame(1, $summary['completed']);

        $offices = $this->asRole(Role::SUPER_ADMIN)
            ->getJson('/api/reports/events/offices')
            ->assertOk()
            ->json('data');

        $this->assertCount(2, $offices);
    }

    public function test_event_admin_can_access_event_reports(): void
    {
        $this->seedBookings();

        $this->asRole(Role::EVENT_ADMIN)
            ->getJson('/api/reports/events/summary')
            ->assertOk()
            ->assertJsonPath('data.cards.0.value', 6);
    }

    public function test_event_approval_admin_can_access_limited_event_reports(): void
    {
        $this->seedBookings();

        $this->asRole(Role::EVENT_APPROVAL_ADMIN)
            ->getJson('/api/reports/events/summary')
            ->assertOk()
            ->assertJsonPath('data.limited', true)
            ->assertJsonPath('data.cards.0.value', 6);
    }

    public function test_dean_only_sees_own_office_reports(): void
    {
        $this->seedBookings();

        $response = $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->getJson('/api/reports/events/summary?office_id='.$this->officeB->office_id)
            ->assertOk();

        $cards = $this->cards($response);
        $this->assertSame(4, $cards['total']);
        $this->assertSame(1, $cards['pending']);
        $this->assertSame(2, $cards['approved']);
        $this->assertSame(1, $cards['cancelled']);

        $bookings = $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->getJson('/api/reports/events/bookings')
            ->assertOk()
            ->json('data');

        $purposes = collect($bookings)->pluck('purpose')->all();
        $this->assertContains('Alpha pending', $purposes);
        $this->assertNotContains('Bravo approved', $purposes);
        $this->assertStringNotContainsString('@example.com', (string) json_encode($bookings));
    }

    public function test_faculty_and_student_cannot_access_event_reports(): void
    {
        $this->asRole(Role::FACULTY_STAFF)
            ->getJson('/api/reports/events/summary')
            ->assertForbidden();

        $this->asRole(Role::STUDENT_REPUBLIC)
            ->getJson('/api/reports/events/bookings')
            ->assertForbidden();
    }

    public function test_unauthorized_roles_cannot_access_event_reports(): void
    {
        $this->asRole(Role::VEHICLE_ADMIN)
            ->getJson('/api/reports/events/summary')
            ->assertForbidden();

        $this->asRole(Role::VEHICLE_APPROVAL_ADMIN)
            ->getJson('/api/reports/events/venues')
            ->assertForbidden();
    }

    public function test_date_and_combined_filters(): void
    {
        $this->seedBookings();

        $cards = $this->cards(
            $this->asRole(Role::SUPER_ADMIN)
                ->getJson('/api/reports/events/summary?start_date='.now()->toDateString().'&end_date='.now()->toDateString().'&status=approved&venue_id='.$this->hallA->venue_id)
                ->assertOk()
        );

        $this->assertSame(1, $cards['total']);
        $this->assertSame(1, $cards['approved']);
        $this->assertSame(0, $cards['pending']);

        $search = $this->asRole(Role::SUPER_ADMIN)
            ->getJson('/api/reports/events/bookings?search=Bravo')
            ->assertOk()
            ->json('data');

        $this->assertCount(2, $search);
    }

    public function test_soft_deleted_bookings_are_excluded(): void
    {
        $this->seedBookings();
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Trashed',
            'status' => 'approved',
            'is_deleted' => true,
        ]);

        $cards = $this->cards(
            $this->asRole(Role::SUPER_ADMIN)->getJson('/api/reports/events/summary')->assertOk()
        );

        $this->assertSame(6, $cards['total']);
        $this->assertSame(3, $cards['approved']);
    }

    public function test_cancelled_bookings_are_not_counted_as_approved(): void
    {
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Cancelled only',
            'status' => 'cancelled',
        ]);

        $cards = $this->cards(
            $this->asRole(Role::SUPER_ADMIN)->getJson('/api/reports/events/summary')->assertOk()
        );

        $this->assertSame(0, $cards['approved']);
        $this->assertSame(1, $cards['cancelled']);
    }

    public function test_venue_utilization_ranks_frequent_venues(): void
    {
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'One',
            'venue_id' => $this->hallA->venue_id,
            'status' => 'approved',
        ]);
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Two',
            'venue_id' => $this->hallA->venue_id,
            'status' => 'approved',
        ]);
        $this->makeBooking($this->users['faculty-b'], [
            'purpose' => 'Three',
            'venue_id' => $this->hallB->venue_id,
            'status' => 'approved',
        ]);

        $data = $this->asRole(Role::EVENT_ADMIN)
            ->getJson('/api/reports/events/venues')
            ->assertOk()
            ->json('data');

        $this->assertSame('Alpha Hall', $data['most_frequent'][0]['label']);
        $this->assertSame(2, $data['most_frequent'][0]['value']);
        $this->assertSame('Beta Hall', $data['least_utilized'][0]['label']);
    }

    public function test_pagination_and_sorting(): void
    {
        $this->makeBooking($this->users[Role::FACULTY_STAFF], ['purpose' => 'Zebra']);
        $this->makeBooking($this->users[Role::FACULTY_STAFF], ['purpose' => 'Alpha']);

        $page = $this->asRole(Role::SUPER_ADMIN)
            ->getJson('/api/reports/events/bookings?sort=purpose&direction=asc&per_page=1&page=1')
            ->assertOk();

        $this->assertSame('Alpha', $page->json('data.0.purpose'));
        $this->assertSame(1, $page->json('meta.per_page'));
        $this->assertSame(2, $page->json('meta.total'));
        $this->assertSame(2, $page->json('meta.last_page'));
    }

    public function test_client_user_id_does_not_expand_access(): void
    {
        $this->seedBookings();

        $cards = $this->cards(
            $this->asRole(Role::DEAN_OFFICE_HEAD)
                ->getJson('/api/reports/events/summary?user_id='.$this->users['faculty-b']->user_id.'&role_id=1')
                ->assertOk()
        );

        $this->assertSame(4, $cards['total']);
    }

    /**
     * @return array<string, int>
     */
    private function cards($response): array
    {
        $cards = [];

        foreach ($response->json('data.cards') as $card) {
            $cards[$card['key']] = (int) $card['value'];
        }

        return $cards;
    }

    private function seedBookings(): void
    {
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha pending',
            'status' => 'pending',
            'venue_id' => $this->hallA->venue_id,
        ]);
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha approved today',
            'status' => 'approved',
            'venue_id' => $this->hallA->venue_id,
        ]);
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha completed',
            'status' => 'approved',
            'venue_id' => $this->hallB->venue_id,
            'date_start' => now()->subDays(10)->toDateString(),
            'date_end' => now()->subDays(8)->toDateString(),
        ]);
        $this->makeBooking($this->users[Role::FACULTY_STAFF], [
            'purpose' => 'Alpha cancelled',
            'status' => 'cancelled',
        ]);
        $this->makeBooking($this->users['faculty-b'], [
            'purpose' => 'Bravo approved',
            'status' => 'approved',
            'venue_id' => $this->hallB->venue_id,
        ]);
        $this->makeBooking($this->users['faculty-b'], [
            'purpose' => 'Bravo rejected',
            'status' => 'rejected',
            'venue_id' => $this->hallB->venue_id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeBooking(User $owner, array $overrides = []): EventBooking
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
