<?php

namespace Tests\Feature\Auth;

use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SanctumAuthTest extends TestCase
{
    use RefreshDatabase;

    private Office $office;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);

        $this->office = Office::create([
            'office_code' => 'AUTH',
            'office_name' => 'Auth Office',
            'status' => 'active',
            'is_deleted' => false,
        ]);
    }

    public function test_login_succeeds_with_email_and_regenerates_session(): void
    {
        $user = $this->makeUser();
        $sessionId = $this->app['session']->getId();

        $response = $this->withStatefulOrigin()
            ->postJson('/api/auth/login', [
                'login' => $user->email,
                'password' => 'password',
            ]);

        $response->assertOk()
            ->assertJsonPath('user.user_id', $user->user_id)
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.role.slug', Role::SUPER_ADMIN)
            ->assertJsonMissingPath('user.password')
            ->assertJsonStructure([
                'message',
                'user' => ['user_id', 'email', 'username', 'role', 'office'],
                'permissions' => ['role_slug', 'abilities', 'sidebar_groups'],
            ]);

        $this->assertAuthenticated('web');
        $this->assertNotSame($sessionId, $this->app['session']->getId());
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_login_succeeds_with_username(): void
    {
        $user = $this->makeUser();

        $this->withStatefulOrigin()
            ->postJson('/api/auth/login', [
                'login' => $user->username,
                'password' => 'password',
            ])
            ->assertOk()
            ->assertJsonPath('user.username', $user->username);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        $user = $this->makeUser();

        $this->withStatefulOrigin()
            ->postJson('/api/auth/login', [
                'login' => $user->email,
                'password' => 'wrong-password',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['login']);

        $this->assertGuest('web');
    }

    public function test_login_rejects_inactive_roles(): void
    {
        $role = Role::where('slug', Role::SUPER_ADMIN)->firstOrFail();
        $role->forceFill(['status' => 'inactive'])->save();
        $user = $this->makeUser();

        $this->withStatefulOrigin()
            ->postJson('/api/auth/login', [
                'login' => $user->email,
                'password' => 'password',
            ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'This account does not have an active role.');

        $this->assertGuest('web');
    }

    public function test_login_rejects_inactive_accounts(): void
    {
        $user = $this->makeUser(['account_status' => 'Inactive']);

        $this->withStatefulOrigin()
            ->postJson('/api/auth/login', [
                'login' => $user->email,
                'password' => 'password',
            ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'This account is inactive. Contact an administrator.');

        $this->assertGuest('web');
    }

    public function test_me_requires_authentication(): void
    {
        $this->withStatefulOrigin()
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

    public function test_authenticated_me_returns_user_and_permissions(): void
    {
        $user = $this->makeUser();

        $this->withStatefulOrigin()
            ->actingAs($user, 'web')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.user_id', $user->user_id)
            ->assertJsonPath('permissions.role_slug', Role::SUPER_ADMIN)
            ->assertJsonMissingPath('user.password');
    }

    public function test_logout_invalidates_the_session(): void
    {
        $user = $this->makeUser();

        $this->withStatefulOrigin()
            ->postJson('/api/auth/login', [
                'login' => $user->email,
                'password' => 'password',
            ])
            ->assertOk();

        $this->assertAuthenticated('web');

        $this->withStatefulOrigin()
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logged out successfully.');

        $this->assertGuest('web');
    }

    public function test_csrf_cookie_endpoint_is_available(): void
    {
        $this->withStatefulOrigin()
            ->get('/sanctum/csrf-cookie')
            ->assertNoContent();
    }

    private function withStatefulOrigin()
    {
        return $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Referer' => 'http://localhost:5173/',
            'Accept' => 'application/json',
        ]);
    }

    private function makeUser(array $overrides = []): User
    {
        $role = Role::where('slug', Role::SUPER_ADMIN)->firstOrFail();

        return User::create(array_merge([
            'first_name' => 'Auth',
            'last_name' => 'Admin',
            'email' => 'auth-admin@example.com',
            'username' => 'authadmin',
            'password' => Hash::make('password'),
            'office_id' => $this->office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ], $overrides));
    }
}
