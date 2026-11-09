<?php

namespace App\Providers;

use App\Models\User;
use App\Permissions\Permission;
use App\Permissions\PermissionChecker;
use App\Permissions\PermissionContext;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PermissionChecker::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::before(function ($user, string $ability, array $arguments = []) {
            if (!$user instanceof User || !Permission::knows($ability)) {
                return null;
            }

            $context = PermissionContext::from(
                $arguments === []
                    ? null
                    : (array_is_list($arguments) ? ($arguments[0] ?? null) : $arguments)
            );

            return app(PermissionChecker::class)->allows($user, $ability, $context);
        });
    }
}
