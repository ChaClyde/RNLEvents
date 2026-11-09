<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Models\Office;
use App\Permissions\AbilityRule;
use App\Permissions\Permission;
use App\Permissions\PermissionCatalog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    use ScopesQueriesByPermission;
    private const NAME_REGEX = '/^[\p{L}\s.\'-]+$/u';

    private const WITH = ['role', 'office'];

    /*
    |--------------------------------------------------------------------------
    | Validation Helpers
    |--------------------------------------------------------------------------
    */

    private function nameRules(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'string',
            'min:2',
            'max:55',
            'regex:' . self::NAME_REGEX,
        ];
    }

    private function personalRules(?User $user = null): array
    {
        return [
            'first_name' => $this->nameRules(),

            'middle_name' => $this->nameRules(false),

            'last_name' => $this->nameRules(),

            'suffix_name' => [
                'nullable',
                'string',
                'max:10',
                'regex:' . self::NAME_REGEX,
            ],

            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('tbl_users', 'email')
                    ->ignore($user?->user_id, 'user_id'),
            ],

            'username' => [
                'required',
                'string',
                'min:3',
                'max:255',
                Rule::unique('tbl_users', 'username')
                    ->ignore($user?->user_id, 'user_id'),
            ],

            'position' => [
                'nullable',
                'string',
                'max:100',
            ],

            'contact_number' => [
                'nullable',
                'string',
                'max:30',
            ],
        ];
    }

    private function assignmentRules(): array
    {
        return [
            'role_id' => [
                'required',
                'integer',
                Rule::exists('tbl_roles', 'role_id')
                    ->where(fn ($query) => $query
                        ->where('is_deleted', false)
                        ->where('status', 'active')),
            ],

            'office_id' => [
                'required',
                'integer',
                Rule::exists('tbl_offices', 'office_id')
                    ->where(fn ($query) => $query
                        ->where('is_deleted', false)
                        ->where('status', 'active')),
            ],
        ];
    }

    private function validationMessages(): array
    {
        return [
            'first_name.regex' => 'The first name may only contain letters, spaces, periods, apostrophes, and hyphens.',
            'middle_name.regex' => 'The middle name may only contain letters, spaces, periods, apostrophes, and hyphens.',
            'last_name.regex' => 'The last name may only contain letters, spaces, periods, apostrophes, and hyphens.',
            'suffix_name.regex' => 'The suffix may only contain letters, spaces, periods, apostrophes, and hyphens.',

            'email.unique' => 'This email address is already registered.',
            'username.unique' => 'This username is already taken.',

            'role_id.exists' => 'The selected role is unavailable or inactive.',
            'office_id.exists' => 'The selected office is unavailable or inactive.',

            'profile_photo.image' => 'The profile photo must be a valid image.',
            'profile_photo.mimes' => 'The profile photo must be JPG, JPEG, PNG, or WEBP.',
            'profile_photo.max' => 'The profile photo must not exceed 2 MB.',
        ];
    }

    private function notFoundIfDeleted(User $user): void
    {
        abort_if($user->is_deleted, 404, 'User not found.');
    }

    /*
    |--------------------------------------------------------------------------
    | Super Admin Protection
    |--------------------------------------------------------------------------
    */

    private function isSuperAdmin(User $user): bool
    {
        return $user->role()
            ->where('slug', Role::SUPER_ADMIN)
            ->exists();
    }

    private function hasAnotherActiveSuperAdmin(User $user): bool
    {
        return User::where('user_id', '!=', $user->user_id)
            ->where('is_deleted', false)
            ->where('account_status', 'Active')
            ->whereHas('role', function ($query) {
                $query->where('slug', Role::SUPER_ADMIN)
                    ->where('status', 'active')
                    ->where('is_deleted', false);
            })
            ->exists();
    }

    private function canChooseOffice(User $actor, string $ability): bool
    {
        $actor->loadMissing('role');

        return PermissionCatalog::ruleFor($actor->role?->slug, $ability)?->scope
            === AbilityRule::SCOPE_GLOBAL;
    }

    private function assignAuthorizedOffice(Request $request, array $validated, string $ability): array
    {
        if (!$this->canChooseOffice($request->user(), $ability)) {
            $validated['office_id'] = $request->user()->office_id;
        }

        return $validated;
    }

    private function assertAssignableRole(Request $request, int $roleId): void
    {
        $role = Role::query()
            ->where('role_id', $roleId)
            ->where('is_deleted', false)
            ->where('status', 'active')
            ->first();

        abort_unless($role, 422, 'The selected role is unavailable or inactive.');

        if ($this->canChooseOffice($request->user(), Permission::USERS_EDIT)) {
            return;
        }

        $officeAssignable = [
            Role::DEAN_OFFICE_HEAD,
            Role::FACULTY_STAFF,
            Role::STUDENT_REPUBLIC,
        ];

        abort_unless(
            in_array($role->slug, $officeAssignable, true),
            403,
            'You cannot assign this role.',
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Load Active Users
    |--------------------------------------------------------------------------
    */

    public function loadUsers(Request $request)
    {
        $query = User::with(self::WITH)
            ->where('is_deleted', false);

        $query = $this->constrainByPermission(
            $query,
            $request->user(),
            Permission::USERS_VIEW,
        );

        if ($request->filled('search')) {
            $search = trim($request->search);

            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        if (
            $request->filled('office_id')
            && $this->canChooseOffice($request->user(), Permission::USERS_VIEW)
        ) {
            $query->where('office_id', $request->office_id);
        }

        if ($request->filled('account_status')) {
            $query->where('account_status', $request->account_status);
        }

        return response()->json([
            'users' => $query
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Load Trash Users
    |--------------------------------------------------------------------------
    */

    public function loadTrashUsers(Request $request)
    {
        $query = User::with(self::WITH)->onlyDeleted();
        $query = $this->constrainByPermission(
            $query,
            $request->user(),
            Permission::USERS_VIEW,
        );

        return response()->json([
            'users' => $query
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Get User
    |--------------------------------------------------------------------------
    */

    public function getUser($user_id)
    {
        $user = User::with(self::WITH)
            ->active()
            ->findOrFail($user_id);

        return response()->json([
            'user' => $user,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Store User
    |--------------------------------------------------------------------------
    */

    public function storeUser(Request $request)
    {
        $validated = $request->validate(
            array_merge(
                $this->personalRules(),
                $this->assignmentRules(),
                [
                    'password' => [
                        'required',
                        'string',
                        'min:8',
                        'confirmed',
                    ],

                    'account_status' => [
                        'sometimes',
                        Rule::in(['Active', 'Inactive']),
                    ],

                    'profile_photo' => [
                        'nullable',
                        'image',
                        'mimes:jpg,jpeg,png,webp',
                        'max:2048',
                    ],
                ]
            ),
            $this->validationMessages()
        );

        if ($request->hasFile('profile_photo')) {
            $validated['profile_photo'] = $request
                ->file('profile_photo')
                ->store('users', 'profile_photos');
        }

        unset($validated['password_confirmation']);

        $validated = $this->assignAuthorizedOffice(
            $request,
            $validated,
            Permission::USERS_CREATE,
        );
        $this->assertAssignableRole($request, (int) $validated['role_id']);

        $validated['account_status'] = $validated['account_status'] ?? 'Active';
        $validated['must_change_password'] = true;
        $validated['is_deleted'] = false;

        $user = User::create($validated);

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $user->load(self::WITH),
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Update User
    |--------------------------------------------------------------------------
    */

    public function updateUser(Request $request, User $user)
    {
        $this->notFoundIfDeleted($user);

        $validated = $request->validate(
            array_merge(
                $this->personalRules($user),
                $this->assignmentRules(),
                [
                    'account_status' => [
                        'required',
                        Rule::in(['Active', 'Inactive']),
                    ],
                ]
            ),
            $this->validationMessages()
        );

        $validated = $this->assignAuthorizedOffice(
            $request,
            $validated,
            Permission::USERS_EDIT,
        );
        $this->assertAssignableRole($request, (int) $validated['role_id']);

        $willLoseSuperAdminAccess =
            (int) $user->role_id !== (int) $validated['role_id'] ||
            $validated['account_status'] !== 'Active';

        if (
            $this->isSuperAdmin($user) &&
            $willLoseSuperAdminAccess &&
            !$this->hasAnotherActiveSuperAdmin($user)
        ) {
            return response()->json([
                'message' => 'You cannot remove or deactivate the last active Super Admin account.',
            ], 422);
        }

        if ($user->email !== $validated['email']) {
            $user->email_verified_at = null;
        }

        $user->fill($validated);
        $user->save();

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $user->fresh()->load(self::WITH),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Reset Password
    |--------------------------------------------------------------------------
    */

    public function resetPassword(Request $request, User $user)
    {
        $this->notFoundIfDeleted($user);

        $validated = $request->validate([
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $user->password = $validated['password'];
        $user->must_change_password = true;
        $user->save();

        return response()->json([
            'message' => 'Password reset successfully.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Move User to Trash
    |--------------------------------------------------------------------------
    */

    public function destroyUser(Request $request, User $user)
    {
        $this->notFoundIfDeleted($user);

        if (
            $request->user() &&
            (int) $request->user()->user_id === (int) $user->user_id
        ) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 403);
        }

        if (
            $this->isSuperAdmin($user) &&
            !$this->hasAnotherActiveSuperAdmin($user)
        ) {
            return response()->json([
                'message' => 'You cannot delete the last active Super Admin account.',
            ], 422);
        }

        $user->is_deleted = true;
        $user->save();

        return response()->json([
            'message' => 'User moved to Trash Bin successfully.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Restore User
    |--------------------------------------------------------------------------
    */

    public function restoreUser(User $user)
    {
        if (!$user->is_deleted) {
            return response()->json([
                'message' => 'This user is not in the Trash Bin.',
            ], 422);
        }

        $roleIsAvailable = Role::where('role_id', $user->role_id)
            ->where('is_deleted', false)
            ->where('status', 'active')
            ->exists();

        $officeIsAvailable = Office::where('office_id', $user->office_id)
            ->where('is_deleted', false)
            ->where('status', 'active')
            ->exists();

        if (!$roleIsAvailable || !$officeIsAvailable) {
            return response()->json([
                'message' => 'The assigned role or office is inactive or deleted. Restore or activate them first.',
            ], 422);
        }

        $user->is_deleted = false;
        $user->save();

        return response()->json([
            'message' => 'User restored successfully.',
            'user' => $user->fresh()->load(self::WITH),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Permanently Delete User
    |--------------------------------------------------------------------------
    */

    public function forceDeleteUser(User $user)
    {
        if (!$user->is_deleted) {
            return response()->json([
                'message' => 'Only users in the Trash Bin can be permanently deleted.',
            ], 422);
        }

        if (
            $this->isSuperAdmin($user) &&
            !$this->hasAnotherActiveSuperAdmin($user)
        ) {
            return response()->json([
                'message' => 'You cannot permanently delete the last active Super Admin account.',
            ], 422);
        }

        if ($user->profile_photo) {
            Storage::disk('profile_photos')->delete($user->profile_photo);
        }

        $user->delete();

        return response()->json([
            'message' => 'User permanently deleted successfully.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Upload Profile Photo
    |--------------------------------------------------------------------------
    */

    public function uploadProfilePhoto(Request $request, User $user)
    {
        $this->notFoundIfDeleted($user);

        $validated = $request->validate(
            [
                'profile_photo' => [
                    'required',
                    'image',
                    'mimes:jpg,jpeg,png,webp',
                    'max:2048',
                ],
            ],
            $this->validationMessages()
        );

        if ($user->profile_photo) {
            Storage::disk('profile_photos')->delete($user->profile_photo);
        }

        $user->profile_photo = $validated['profile_photo']
            ->store('users', 'profile_photos');

        $user->save();

        return response()->json([
            'message' => 'Profile photo uploaded successfully.',
            'user' => $user->fresh()->load(self::WITH),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Show Profile Photo
    |--------------------------------------------------------------------------
    */

    public function showProfilePhoto(User $user)
    {
        $this->notFoundIfDeleted($user);

        if (
            !$user->profile_photo ||
            !Storage::disk('profile_photos')->exists($user->profile_photo)
        ) {
            return response()->json([
                'message' => 'Profile photo not found.',
            ], 404);
        }

        return Storage::disk('profile_photos')
            ->response($user->profile_photo);
    }

    /*
    |--------------------------------------------------------------------------
    | Remove Profile Photo
    |--------------------------------------------------------------------------
    */

    public function removeProfilePhoto(User $user)
    {
        $this->notFoundIfDeleted($user);

        if ($user->profile_photo) {
            Storage::disk('profile_photos')
                ->delete($user->profile_photo);

            $user->profile_photo = null;
            $user->save();
        }

        return response()->json([
            'message' => 'Profile photo removed successfully.',
            'user' => $user->fresh()->load(self::WITH),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Update Own Profile
    |--------------------------------------------------------------------------
    */

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->is_deleted) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validate(
            array_merge(
                $this->personalRules($user),
                [
                    'current_password' => [
                        'required_with:new_password',
                        'current_password',
                    ],

                    'new_password' => [
                        'nullable',
                        'string',
                        'min:8',
                        'confirmed',
                    ],
                ]
            ),
            $this->validationMessages()
        );

        if ($user->email !== $validated['email']) {
            $user->email_verified_at = null;
        }

        $user->fill([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'suffix_name' => $validated['suffix_name'] ?? null,
            'email' => $validated['email'],
            'username' => $validated['username'],
            'position' => $validated['position'] ?? null,
            'contact_number' => $validated['contact_number'] ?? null,
        ]);

        if (!empty($validated['new_password'])) {
            $user->password = $validated['new_password'];
            $user->must_change_password = false;
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user->fresh()->load(self::WITH),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | User Activity Heartbeat
    |--------------------------------------------------------------------------
    */

    public function heartbeat(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->is_deleted) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $user->forceFill([
            'last_activity_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Activity updated successfully.',
            'last_activity_at' => $user->last_activity_at,
        ]);
    }
}