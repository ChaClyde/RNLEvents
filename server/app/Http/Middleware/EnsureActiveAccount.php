<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user instanceof User) {
            return $next($request);
        }

        $user->refresh()->loadMissing('role');

        if ($user->is_deleted || ($user->account_status ?? 'Active') !== 'Active') {
            abort(403, 'This account is inactive. Contact an administrator.');
        }

        $role = $user->role;

        if ($role === null || $role->is_deleted || $role->status !== 'active') {
            abort(403, 'This account does not have an active role.');
        }

        return $next($request);
    }
}
