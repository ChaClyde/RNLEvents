<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use App\Permissions\PermissionChecker;
use Illuminate\Database\Eloquent\Builder;

trait ScopesQueriesByPermission
{
    protected function constrainByPermission(Builder $query, User $user, string ...$abilities): Builder
    {
        $checker = app(PermissionChecker::class);

        foreach ($abilities as $ability) {
            if ($user->allows($ability)) {
                return $checker->constrainQuery($query, $user, $ability);
            }
        }

        return $query->whereRaw('1 = 0');
    }
}
