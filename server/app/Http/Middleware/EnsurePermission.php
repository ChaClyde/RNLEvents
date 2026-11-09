<?php

namespace App\Http\Middleware;

use App\Models\Driver;
use App\Models\Event;
use App\Models\EventBooking;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Models\Venue;
use App\Permissions\Permission;
use App\Permissions\PermissionContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $ability, string ...$options): Response
    {
        $user = $request->user();

        if (!$user instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        if (!Permission::knows($ability)) {
            abort(403, 'This action is unauthorized.');
        }

        $allowSelf = in_array('self', $options, true);
        $bypassable = in_array('bypassable', $options, true);
        $resource = $this->resourceFrom($request);

        if ($allowSelf && $this->isActingOnSelf($request, $user, $resource)) {
            return $next($request);
        }

        $bypassRequested = $bypassable && $this->bypassRequested($request);
        $context = $this->contextFrom($resource, $bypassRequested);
        $abilities = $this->abilities($ability, $options);

        $allowed = false;

        foreach ($abilities as $candidate) {
            if (!Permission::knows($candidate)) {
                continue;
            }

            $allowed = $bypassRequested
                ? $user->allowsWithEmergencyBypass($candidate, $context)
                : $user->allows($candidate, $context);

            if ($allowed) {
                break;
            }
        }

        abort_unless($allowed, 403, 'This action is unauthorized.');

        return $next($request);
    }

    /**
     * @param  list<string>  $options
     * @return list<string>
     */
    private function abilities(string $ability, array $options): array
    {
        $abilities = [$ability];

        foreach ($options as $option) {
            if (str_starts_with($option, 'or:')) {
                $abilities[] = substr($option, 3);
            }
        }

        return $abilities;
    }

    private function contextFrom(mixed $resource, bool $emergencyBypass): PermissionContext
    {
        return PermissionContext::from([
            'resource' => $resource,
            'emergency_bypass' => $emergencyBypass,
        ]);
    }

    private function resourceFrom(Request $request): mixed
    {
        $route = $request->route();

        if ($route === null) {
            return null;
        }

        foreach ($route->parameters() as $parameter) {
            if (is_object($parameter)) {
                return $parameter;
            }
        }

        $map = [
            'user' => [User::class, 'user_id'],
            'user_id' => [User::class, 'user_id'],
            'role' => [Role::class, 'role_id'],
            'office' => [Office::class, 'office_id'],
            'venue_id' => [Venue::class, 'venue_id'],
            'event_id' => [Event::class, 'event_id'],
            'event' => [Event::class, 'event_id'],
            'vehicle_id' => [Vehicle::class, 'vehicle_id'],
            'driver_id' => [Driver::class, 'driver_id'],
            'event_booking_id' => [EventBooking::class, 'event_booking_id'],
            'vehicle_booking_id' => [VehicleBooking::class, 'vehicle_booking_id'],
        ];

        foreach ($map as $name => [$class, $key]) {
            $value = $route->parameter($name);

            if ($value === null || $value === '') {
                continue;
            }

            if (is_object($value)) {
                return $value;
            }

            return $class::query()->where($key, $value)->first();
        }

        return null;
    }

    private function isActingOnSelf(Request $request, User $actor, mixed $resource): bool
    {
        if ($resource instanceof User) {
            return (int) $resource->user_id === (int) $actor->user_id;
        }

        $target = $request->route('user') ?? $request->route('user_id');

        if ($target instanceof User) {
            return (int) $target->user_id === (int) $actor->user_id;
        }

        if ($target === null || $target === '') {
            return false;
        }

        return (int) $target === (int) $actor->user_id;
    }

    private function bypassRequested(Request $request): bool
    {
        $header = strtolower((string) $request->header('X-Emergency-Bypass', ''));

        if (in_array($header, ['1', 'true', 'yes'], true)) {
            return true;
        }

        return filter_var($request->input('emergency_bypass'), FILTER_VALIDATE_BOOLEAN);
    }
}
