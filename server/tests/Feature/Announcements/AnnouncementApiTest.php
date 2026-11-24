<?php

namespace Tests\Feature\Announcements;

use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AnnouncementApiTest extends TestCase
{
    use RefreshDatabase;

    private User $eventAdmin;

    private User $faculty;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $office = Office::create([
            'office_code' => 'ANN',
            'office_name' => 'Announcement Office',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->eventAdmin = $this->userFor(Role::EVENT_ADMIN, $office, 'event-ann');
        $this->faculty = $this->userFor(Role::FACULTY_STAFF, $office, 'faculty-ann');
    }

    public function test_posting_admins_publish_and_everyone_can_read(): void
    {
        $this->asUser($this->eventAdmin)
            ->postJson('/api/announcements', [
                'title' => 'Gym closed Friday',
                'body' => 'The gym is reserved for graduation practice.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Gym closed Friday');

        $this->asUser($this->userFor(Role::VEHICLE_ADMIN, $this->eventAdmin->office, 'vehicle-ann'))
            ->postJson('/api/announcements', [
                'title' => 'Van schedule',
                'body' => 'The Crosswind is under maintenance tomorrow.',
            ])
            ->assertCreated();

        $seen = $this->asUser($this->faculty)
            ->getJson('/api/announcements')
            ->assertOk()
            ->assertJsonPath('can_publish', false);

        $this->assertEqualsCanonicalizing(
            ['Gym closed Friday', 'Van schedule'],
            collect($seen->json('data'))->pluck('title')->all()
        );
    }

    public function test_viewers_cannot_post_or_remove_announcements(): void
    {
        $created = $this->asUser($this->eventAdmin)
            ->postJson('/api/announcements', [
                'title' => 'Office notice',
                'body' => 'Please submit requests two days ahead.',
            ])
            ->assertCreated()
            ->json('data.announcement_id');

        $this->asUser($this->faculty)
            ->postJson('/api/announcements', [
                'title' => 'Not allowed',
                'body' => 'A viewer tried to post.',
            ])
            ->assertForbidden();

        $this->asUser($this->faculty)
            ->deleteJson('/api/announcements/'.$created)
            ->assertForbidden();

        $this->asUser($this->eventAdmin)
            ->deleteJson('/api/announcements/'.$created)
            ->assertOk();

        $this->asUser($this->faculty)
            ->getJson('/api/announcements')
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    private function asUser(User $user)
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        return $this->actingAs($user, 'web');
    }

    private function userFor(string $slug, Office $office, string $key): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();

        return User::create([
            'first_name' => 'Ann',
            'last_name' => $key,
            'email' => $key.'@example.com',
            'username' => $key,
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load(['role', 'office']);
    }
}
