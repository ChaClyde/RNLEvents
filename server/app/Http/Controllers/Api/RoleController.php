<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RoleController extends Controller
{
    private const NAME_REGEX = '/^[\p{L}0-9\s\/&().\'-]+$/u';

    /*
    |--------------------------------------------------------------------------
    | Shared Helpers
    |--------------------------------------------------------------------------
    */

    private function messages(): array
    {
        return [
            'name.regex' => 'The role name contains invalid characters.',
            'status.in' => 'Invalid role status.',
        ];
    }

    private function notFoundIfDeleted(Role $role)
    {
        return $role->is_deleted
            ? response()->json([
                'message' => 'Role not found.',
            ], 404)
            : null;
    }

    /**
     * Build the slug from the role name.
     * "/" and "&" become spaces first, so "Faculty/Staff" becomes
     * "faculty-staff" instead of "facultystaff".
     */
    private function makeSlug(string $name): string
    {
        $slug = Str::slug(str_replace(['/', '&'], ' ', $name));

        // A name such as "()" or "&&" passes the regex but has no letters or numbers.
        if ($slug === '') {
            throw ValidationException::withMessages([
                'name' => ['The role name must contain at least one letter or number.'],
            ]);
        }

        return $slug;
    }

    /**
     * Check name (and slug on create) against ALL roles, including the Trash Bin,
     * because the database unique index applies to trashed rows too.
     */
    private function ensureUnique(string $name, ?string $slug = null, ?int $ignoreRoleId = null): void
    {
        $existing = Role::query()
            ->when($ignoreRoleId, fn ($q) => $q->where('role_id', '!=', $ignoreRoleId))
            ->where(function ($q) use ($name, $slug) {
                $q->where('name', $name);

                if ($slug !== null) {
                    $q->orWhere('slug', $slug);
                }
            })
            ->first();

        if (!$existing) {
            return;
        }

        throw ValidationException::withMessages([
            'name' => [
                $existing->is_deleted
                    ? 'A role with this name already exists in the Trash Bin. Restore it instead.'
                    : 'A role with this name (or a very similar one) already exists.',
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Read
    |--------------------------------------------------------------------------
    */

    public function loadRoles()
    {
        $roles = Role::notDeleted()
            ->withCount('users')
            ->orderBy('name')
            ->get();

        return response()->json([
            'roles' => $roles,
        ], 200);
    }

    public function loadTrashRoles()
    {
        $roles = Role::deleted()
            ->withCount('users')
            ->orderBy('name')
            ->get();

        return response()->json([
            'roles' => $roles,
        ], 200);
    }

    public function getRole(Role $role)
    {
        if ($response = $this->notFoundIfDeleted($role)) {
            return $response;
        }

        $role->loadCount('users');

        return response()->json([
            'role' => $role,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Create
    |--------------------------------------------------------------------------
    */

    public function storeRole(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'min:2',
                'max:100',
                'regex:' . self::NAME_REGEX,
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'status' => [
                'sometimes',
                'required',
                Rule::in(['active', 'inactive']),
            ],
        ], $this->messages());

        $slug = $this->makeSlug($validated['name']);

        $this->ensureUnique($validated['name'], $slug);

        $role = Role::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',

            // System roles are created by RoleSeeder only.
            'is_system_role' => false,
            'is_deleted' => false,
        ]);

        $role->loadCount('users');

        return response()->json([
            'message' => 'Role successfully created.',
            'role' => $role,
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Update
    |--------------------------------------------------------------------------
    */

    public function updateRole(Request $request, Role $role)
    {
        if ($response = $this->notFoundIfDeleted($role)) {
            return $response;
        }

        // System roles can only have their descriptions edited.
        if ($role->is_system_role) {
            $validated = $request->validate([
                'description' => [
                    'nullable',
                    'string',
                    'max:5000',
                ],
            ]);

            $role->update([
                'description' => $validated['description'] ?? null,
            ]);

            return response()->json([
                'message' => 'System role description updated successfully.',
                'role' => $role->fresh()->loadCount('users'),
            ], 200);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'min:2',
                'max:100',
                'regex:' . self::NAME_REGEX,
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'status' => [
                'required',
                Rule::in(['active', 'inactive']),
            ],
        ], $this->messages());

        // Make sure the new name is still a valid, non-empty slug source.
        $this->makeSlug($validated['name']);

        $this->ensureUnique($validated['name'], null, $role->role_id);

        // The slug is NOT regenerated on rename. Permission checks and
        // middleware refer to the slug, so it must stay stable.
        $role->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => 'Role successfully updated.',
            'role' => $role->fresh()->loadCount('users'),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Activate / Deactivate
    |--------------------------------------------------------------------------
    */

    public function activateRole(Role $role)
    {
        if ($response = $this->notFoundIfDeleted($role)) {
            return $response;
        }

        $role->update([
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'Role activated successfully.',
            'role' => $role->fresh()->loadCount('users'),
        ], 200);
    }

    public function deactivateRole(Role $role)
    {
        if ($response = $this->notFoundIfDeleted($role)) {
            return $response;
        }

        if ($role->is_system_role) {
            return response()->json([
                'message' => 'System roles cannot be deactivated.',
            ], 422);
        }

        $role->update([
            'status' => 'inactive',
        ]);

        return response()->json([
            'message' => 'Role deactivated successfully.',
            'role' => $role->fresh()->loadCount('users'),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Soft Delete
    |--------------------------------------------------------------------------
    */

    public function destroyRole(Role $role)
    {
        if ($response = $this->notFoundIfDeleted($role)) {
            return $response;
        }

        if ($role->is_system_role) {
            return response()->json([
                'message' => 'System roles cannot be deleted.',
            ], 422);
        }

        if ($role->users()->exists()) {
            return response()->json([
                'message' => 'Reassign the users assigned to this role before deleting it.',
            ], 422);
        }

        $role->update([
            'is_deleted' => true,
        ]);

        return response()->json([
            'message' => 'Role successfully deleted.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Restore
    |--------------------------------------------------------------------------
    */

    public function restoreRole(Role $role)
    {
        if (!$role->is_deleted) {
            return response()->json([
                'message' => 'This role is already active.',
            ], 422);
        }

        $role->update([
            'is_deleted' => false,
        ]);

        return response()->json([
            'message' => 'Role restored successfully.',
            'role' => $role->fresh()->loadCount('users'),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Permanent Delete
    |--------------------------------------------------------------------------
    */

    public function forceDeleteRole(Role $role)
    {
        if (!$role->is_deleted) {
            return response()->json([
                'message' => 'Only deleted roles can be permanently removed.',
            ], 422);
        }

        if ($role->is_system_role) {
            return response()->json([
                'message' => 'System roles cannot be permanently deleted.',
            ], 422);
        }

        // Check all users, including users in the Trash Bin.
        if (User::where('role_id', $role->role_id)->exists()) {
            return response()->json([
                'message' => 'This role cannot be permanently deleted because users are still assigned to it. Reassign or permanently delete those users first.',
            ], 422);
        }

        $role->delete();

        return response()->json([
            'message' => 'Role permanently deleted.',
        ], 200);
    }
}
