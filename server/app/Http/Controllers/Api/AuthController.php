<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->with(['role', 'office'])
            ->where('is_deleted', false)
            ->where(function ($query) use ($validated) {
                $query->where('email', $validated['login'])
                    ->orWhere('username', $validated['login']);
            })
            ->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->account_status !== 'Active') {
            return response()->json([
                'message' => 'This account is inactive. Contact an administrator.',
            ], 403);
        }

        if ($user->role === null || $user->role->is_deleted || $user->role->status !== 'active') {
            return response()->json([
                'message' => 'This account does not have an active role.',
            ], 403);
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        $user->forceFill([
            'last_login_at' => now(),
            'last_activity_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Logged in successfully.',
            ...$user->fresh()->toAuthenticatedArray(),
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        $user->forceFill([
            'last_activity_at' => now(),
        ])->save();

        return response()->json($user->toAuthenticatedArray());
    }
}
