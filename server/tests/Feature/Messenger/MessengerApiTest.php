<?php

namespace Tests\Feature\Messenger;

use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MessengerApiTest extends TestCase
{
    use RefreshDatabase;

    private User $faculty;

    private User $dean;

    private User $inactive;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $office = Office::create([
            'office_code' => 'MSG',
            'office_name' => 'Messenger Office',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $this->faculty = $this->userFor(Role::FACULTY_STAFF, $office, 'faculty-msg');
        $this->dean = $this->userFor(Role::DEAN_OFFICE_HEAD, $office, 'dean-msg');
        $this->inactive = $this->userFor(Role::FACULTY_STAFF, $office, 'inactive-msg', 'Inactive');
    }

    public function test_users_can_exchange_a_direct_message(): void
    {
        $opened = $this->asUser($this->faculty)
            ->postJson('/api/messenger/conversations', ['user_id' => $this->dean->user_id])
            ->assertOk()
            ->json('data');

        $this->asUser($this->faculty)
            ->postJson('/api/messenger/conversations/'.$opened['conversation_id'].'/messages', [
                'body' => 'Good morning',
            ])
            ->assertCreated();

        $inbox = $this->asUser($this->dean)
            ->getJson('/api/messenger/conversations')
            ->assertOk()
            ->json('data');

        $this->assertSame('Good morning', $inbox[0]['last_message']);
        $this->assertSame(1, $inbox[0]['unread_count']);

        $thread = $this->asUser($this->dean)
            ->getJson('/api/messenger/conversations/'.$opened['conversation_id'].'/messages')
            ->assertOk()
            ->json('data.messages');

        $this->assertSame('Good morning', $thread[0]['body']);
        $this->assertFalse($thread[0]['mine']);

        $this->asUser($this->dean)
            ->getJson('/api/messenger/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.unread_count', 0);
    }

    public function test_a_user_cannot_read_someone_elses_conversation(): void
    {
        $opened = $this->asUser($this->faculty)
            ->postJson('/api/messenger/conversations', ['user_id' => $this->dean->user_id])
            ->assertOk()
            ->json('data.conversation_id');

        $outsider = $this->userFor(Role::EVENT_ADMIN, $this->faculty->office, 'event-msg');

        $this->asUser($outsider)
            ->getJson('/api/messenger/conversations/'.$opened.'/messages')
            ->assertNotFound();
    }

    public function test_directory_search_matches_a_full_name(): void
    {
        $matches = $this->asUser($this->faculty)
            ->getJson('/api/messenger/users?search='.urlencode('Msg dean-msg'))
            ->assertOk()
            ->json('data');

        $this->assertSame([$this->dean->user_id], collect($matches)->pluck('user_id')->all());
    }

    public function test_inactive_users_cannot_be_messaged(): void
    {
        $this->asUser($this->faculty)
            ->postJson('/api/messenger/conversations', ['user_id' => $this->inactive->user_id])
            ->assertStatus(422);

        $this->asUser($this->faculty)
            ->postJson('/api/messenger/conversations', ['user_id' => $this->faculty->user_id])
            ->assertStatus(422);
    }

    private function asUser(User $user)
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        return $this->actingAs($user, 'web');
    }

    private function userFor(string $slug, Office $office, string $key, string $status = 'Active'): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();

        return User::create([
            'first_name' => 'Msg',
            'last_name' => $key,
            'email' => $key.'@example.com',
            'username' => $key,
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => $status,
            'is_deleted' => false,
        ])->load(['role', 'office']);
    }
}
