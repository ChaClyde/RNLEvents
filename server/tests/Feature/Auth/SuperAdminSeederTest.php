<?php

namespace Tests\Feature\Auth;

use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class SuperAdminSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);
        $this->clearSeederPassword();
    }

    protected function tearDown(): void
    {
        $this->clearSeederPassword();

        parent::tearDown();
    }

    public function test_seeder_fails_safely_when_password_is_missing(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('FILSCHED_SUPERADMIN_PASSWORD is missing');

        $this->seed(SuperAdminSeeder::class);
    }

    public function test_seeder_creates_a_separate_active_super_admin_account(): void
    {
        $this->setSeederPassword('local-super-secret');

        $this->seed(SuperAdminSeeder::class);

        $user = User::query()
            ->with(['role', 'office'])
            ->where('username', SuperAdminSeeder::USERNAME)
            ->first();

        $this->assertNotNull($user);
        $this->assertSame(SuperAdminSeeder::EMAIL, $user->email);
        $this->assertSame('Active', $user->account_status);
        $this->assertFalse((bool) $user->is_deleted);
        $this->assertSame(Role::SUPER_ADMIN, $user->role?->slug);
        $this->assertNotNull($user->office_id);
        $this->assertNotNull($user->office);
        $this->assertTrue(Hash::check('local-super-secret', $user->password));
    }

    public function test_seeder_is_idempotent_and_does_not_overwrite_an_existing_password(): void
    {
        $this->setSeederPassword('first-password');
        $this->seed(SuperAdminSeeder::class);

        $originalHash = User::query()
            ->where('username', SuperAdminSeeder::USERNAME)
            ->value('password');

        $this->setSeederPassword('second-password');
        $this->seed(SuperAdminSeeder::class);

        $user = User::query()
            ->where('username', SuperAdminSeeder::USERNAME)
            ->firstOrFail();

        $this->assertSame(1, User::query()->where('username', SuperAdminSeeder::USERNAME)->count());
        $this->assertSame($originalHash, $user->password);
        $this->assertTrue(Hash::check('first-password', $user->password));
        $this->assertFalse(Hash::check('second-password', $user->password));
        $this->assertSame('Active', $user->account_status);
    }

    public function test_seeder_does_not_modify_the_chaclyde_account(): void
    {
        $office = Office::create([
            'office_code' => 'CHA',
            'office_name' => 'ChaClyde Office',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $role = Role::where('slug', Role::SUPER_ADMIN)->firstOrFail();

        $chaClyde = User::create([
            'first_name' => 'ChaClyde',
            'last_name' => 'Admin',
            'email' => 'chaclyde@filsched.local',
            'username' => 'ChaClyde',
            'password' => 'chaclyde-original',
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ]);
        $original = $chaClyde->only([
            'email',
            'username',
            'password',
            'office_id',
            'role_id',
            'account_status',
        ]);

        $this->setSeederPassword('local-super-secret');
        $this->seed(SuperAdminSeeder::class);

        $chaClyde->refresh();
        $this->assertSame($original['email'], $chaClyde->email);
        $this->assertSame($original['username'], $chaClyde->username);
        $this->assertSame($original['password'], $chaClyde->password);
        $this->assertSame($original['office_id'], $chaClyde->office_id);
        $this->assertSame($original['role_id'], $chaClyde->role_id);
        $this->assertSame(2, User::query()->count());
        $this->assertTrue(
            User::query()->where('username', SuperAdminSeeder::USERNAME)->exists()
        );
    }

    public function test_seeded_account_can_log_in_through_existing_auth(): void
    {
        $this->setSeederPassword('local-super-secret');
        $this->seed(SuperAdminSeeder::class);

        $this->withHeader('Origin', 'http://localhost:5173')
            ->withHeader('Referer', 'http://localhost:5173')
            ->postJson('/api/auth/login', [
                'login' => SuperAdminSeeder::USERNAME,
                'password' => 'local-super-secret',
            ])
            ->assertOk()
            ->assertJsonPath('user.username', SuperAdminSeeder::USERNAME)
            ->assertJsonPath('user.email', SuperAdminSeeder::EMAIL)
            ->assertJsonPath('user.role.slug', Role::SUPER_ADMIN)
            ->assertJsonMissingPath('user.password');
    }

    private function setSeederPassword(string $password): void
    {
        putenv('FILSCHED_SUPERADMIN_PASSWORD='.$password);
        $_ENV['FILSCHED_SUPERADMIN_PASSWORD'] = $password;
        $_SERVER['FILSCHED_SUPERADMIN_PASSWORD'] = $password;
    }

    private function clearSeederPassword(): void
    {
        putenv('FILSCHED_SUPERADMIN_PASSWORD');
        unset($_ENV['FILSCHED_SUPERADMIN_PASSWORD'], $_SERVER['FILSCHED_SUPERADMIN_PASSWORD']);
    }
}
