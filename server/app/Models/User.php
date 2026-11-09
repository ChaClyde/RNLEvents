<?php

namespace App\Models;

use App\Permissions\Permission;
use App\Permissions\PermissionCatalog;
use App\Permissions\PermissionChecker;
use App\Permissions\PermissionContext;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use InvalidArgumentException;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'tbl_users';

    protected $primaryKey = 'user_id';

    protected $fillable = [
        'profile_photo',
        'first_name',
        'middle_name',
        'last_name',
        'suffix_name',
        'email',
        'username',
        'password',
        'position',
        'contact_number',
        'office_id',
        'role_id',
        'account_status',
        'must_change_password',
        'is_deleted',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'password' => 'hashed',
        'must_change_password' => 'boolean',
        'is_deleted' => 'boolean',
        'optional_permissions' => 'array',
    ];

    protected $appends = [
        'full_name',
        'online_status',
        'profile_photo_url',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id', 'office_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Query Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeActive($query)
    {
        return $query->where('is_deleted', false);
    }

    public function scopeOnlyDeleted($query)
    {
        return $query->where('is_deleted', true);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */

    public function getFullNameAttribute(): string
    {
        return collect([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
            $this->suffix_name,
        ])->filter()->implode(' ');
    }

    public function getOnlineStatusAttribute(): bool
    {
        return $this->last_activity_at !== null
            && $this->last_activity_at->between(
                now()->subMinutes(2),
                now()
            );
    }

    public function getProfilePhotoUrlAttribute(): ?string
    {
        return $this->profile_photo
            ? url("/api/users/getProfilePhoto/{$this->user_id}")
            : null;
    }

    public function toAuthenticatedArray(): array
    {
        $this->loadMissing(['role', 'office']);

        return [
            'user' => [
                'user_id' => $this->user_id,
                'first_name' => $this->first_name,
                'middle_name' => $this->middle_name,
                'last_name' => $this->last_name,
                'suffix_name' => $this->suffix_name,
                'full_name' => $this->full_name,
                'email' => $this->email,
                'username' => $this->username,
                'position' => $this->position,
                'contact_number' => $this->contact_number,
                'office_id' => $this->office_id,
                'role_id' => $this->role_id,
                'account_status' => $this->account_status,
                'must_change_password' => $this->must_change_password,
                'optional_permissions' => $this->optional_permissions ?? [],
                'profile_photo_url' => $this->profile_photo_url,
                'last_login_at' => $this->last_login_at,
                'role' => $this->role ? [
                    'role_id' => $this->role->role_id,
                    'name' => $this->role->name,
                    'slug' => $this->role->slug,
                    'status' => $this->role->status,
                    'is_system_role' => $this->role->is_system_role,
                    'is_deleted' => $this->role->is_deleted,
                ] : null,
                'office' => $this->office ? [
                    'office_id' => $this->office->office_id,
                    'office_code' => $this->office->office_code,
                    'office_name' => $this->office->office_name,
                    'status' => $this->office->status,
                    'is_deleted' => $this->office->is_deleted,
                ] : null,
            ],
            'permissions' => $this->permissionPayload(),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Permissions
    |--------------------------------------------------------------------------
    */

    public function allows(string $ability, mixed $context = null): bool
    {
        return app(PermissionChecker::class)->allows($this, $ability, $context);
    }

    public function allowsWithEmergencyBypass(string $ability, mixed $context = null): bool
    {
        $permissionContext = PermissionContext::from($context)->withEmergencyBypass();

        return app(PermissionChecker::class)->allows($this, $ability, $permissionContext);
    }

    public function authorizePermission(string $ability, mixed $context = null): void
    {
        abort_unless(
            $this->allows($ability, $context),
            403,
            'This action is unauthorized.'
        );
    }

    public function hasEmergencyBypass(): bool
    {
        return app(PermissionChecker::class)->hasEmergencyBypass($this);
    }

    public function isLimited(string $ability): bool
    {
        return app(PermissionChecker::class)->isLimited($this, $ability);
    }

    public function grantedAbilities(): array
    {
        return app(PermissionChecker::class)->grantedAbilities($this);
    }

    public function visibleSidebarGroups(): array
    {
        return app(PermissionChecker::class)->visibleSidebarGroups($this);
    }

    public function grantOptionalPermission(string $ability): void
    {
        $this->loadMissing('role');

        $rule = PermissionCatalog::ruleFor($this->role?->slug, $ability);

        if ($rule === null || !$rule->optional) {
            throw new InvalidArgumentException(
                "{$ability} is not an optional permission for this user's role."
            );
        }

        $current = $this->optional_permissions ?? [];
        $current[] = $ability;

        $this->optional_permissions = array_values(array_unique($current));
        $this->save();
    }

    public function revokeOptionalPermission(string $ability): void
    {
        $current = $this->optional_permissions ?? [];

        $this->optional_permissions = array_values(array_filter(
            $current,
            fn (string $granted) => $granted !== $ability
        ));
        $this->save();
    }

    public function hasOptionalPermission(string $ability): bool
    {
        return in_array($ability, $this->optional_permissions ?? [], true);
    }

    public function permissionPayload(): array
    {
        $this->loadMissing('role');

        $abilities = [];

        foreach ($this->grantedAbilities() as $ability) {
            $rule = PermissionCatalog::ruleFor($this->role?->slug, $ability);

            $abilities[$ability] = [
                'module' => Permission::moduleOf($ability),
                'action' => Permission::actionOf($ability),
                'scope' => $rule?->scope,
                'optional' => $rule?->optional ?? false,
                'limited' => $rule?->limited ?? false,
                'requires_emergency_bypass' => $rule?->requiresEmergencyBypass ?? false,
                'approval_pipeline' => $rule?->approvalPipeline,
                'approval_stages' => $rule?->approvalStages ?? [],
            ];
        }

        return [
            'role_slug' => $this->role?->slug,
            'office_id' => $this->office_id,
            'has_emergency_bypass' => $this->hasEmergencyBypass(),
            'optional_permissions' => $this->optional_permissions ?? [],
            'sidebar_groups' => $this->visibleSidebarGroups(),
            'abilities' => $abilities,
        ];
    }
}