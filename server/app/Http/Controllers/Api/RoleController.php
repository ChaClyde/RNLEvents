<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Role;

class RoleController extends Controller
{
    public function loadRoles()
    {
        $roles = Role::where('tbl_roles.is_deleted', false)
            ->get();

        return response()->json([
            'roles' => $roles,
        ], 200);
    }

    public function storeRole(Request $request)
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z\s]+$/', 'unique:tbl_roles,role'],
            'description' => ['nullable', 'string', 'min:3', 'max:255', 'regex:/^[A-Za-z\s]+$/'],
        ]);

        $role = Role::create([
            'role' => $validated['role'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Role created successfully.',
            'data' => $role,
        ], 201);
    }
}
