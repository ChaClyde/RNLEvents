<?php

namespace App\Scheduling;

use App\Models\User;
use App\Permissions\PermissionContext;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

final class ConflictResponse
{
    /**
     * @param  Collection<int, object>|array<int, object>  $conflicts
     * @param  callable(object): array<string, mixed>  $detailed
     * @param  callable(object): array<string, mixed>  $sanitized
     */
    public static function throw(
        User $viewer,
        string $field,
        string $message,
        string $ability,
        Collection|array $conflicts,
        callable $detailed,
        callable $sanitized,
    ): never {
        $payload = [];

        foreach (Collection::wrap($conflicts) as $conflict) {
            $canSee = $viewer->allows($ability, PermissionContext::from([
                'resource' => $conflict,
            ]));

            $payload[] = $canSee ? $detailed($conflict) : $sanitized($conflict);
        }

        $exception = ValidationException::withMessages([
            $field => [$message],
        ]);

        $exception->response = response()->json([
            'message' => $message,
            'errors' => [$field => [$message]],
            'available' => false,
            'conflicts' => $payload,
        ], 422);

        throw $exception;
    }
}
