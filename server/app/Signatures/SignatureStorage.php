<?php

namespace App\Signatures;

use App\Models\EventBookingApproval;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

final class SignatureStorage
{
    public const USER_DISK = 'user_signatures';

    public const APPROVAL_DISK = 'approval_signatures';

    public const MAX_KILOBYTES = 1024;

    public static function storeUserSignature(User $user, UploadedFile $file): void
    {
        $mime = self::assertImage($file);
        $extension = $mime === 'image/png' ? 'png' : 'jpg';
        $path = 'users/'.$user->user_id.'/'.Str::uuid()->toString().'.'.$extension;
        $stored = $file->storeAs(
            dirname($path),
            basename($path),
            self::USER_DISK,
        );

        if ($stored === false) {
            throw ValidationException::withMessages([
                'signature' => ['The signature could not be stored.'],
            ]);
        }

        $previous = $user->signature_path;

        try {
            $user->forceFill([
                'signature_path' => $stored,
                'signature_mime' => $mime,
            ])->save();
        } catch (Throwable $exception) {
            self::delete(self::USER_DISK, $stored);
            throw $exception;
        }

        if (is_string($previous) && $previous !== $stored) {
            self::delete(self::USER_DISK, $previous);
        }
    }

    public static function deleteUserSignature(User $user): void
    {
        self::delete(self::USER_DISK, $user->signature_path);
        $user->forceFill([
            'signature_path' => null,
            'signature_mime' => null,
        ])->save();
    }

    /**
     * @return array{signature_path: string, signature_mime: string, signer_name: string, signer_position: ?string}
     */
    public static function copyForApproval(User $user): array
    {
        $user->refresh();
        $source = self::safeRelative((string) $user->signature_path);

        if ($source === null || !Storage::disk(self::USER_DISK)->exists($source)) {
            throw ValidationException::withMessages([
                'signature' => ['Save your e-signature in My Profile before approving this booking.'],
            ]);
        }

        $mime = $user->signature_mime === 'image/png' ? 'image/png' : 'image/jpeg';
        $extension = $mime === 'image/png' ? 'png' : 'jpg';
        $path = 'approvals/'.Str::uuid()->toString().'.'.$extension;
        $bytes = Storage::disk(self::USER_DISK)->get($source);

        if (!is_string($bytes) || $bytes === '' || !Storage::disk(self::APPROVAL_DISK)->put($path, $bytes)) {
            throw ValidationException::withMessages([
                'signature' => ['The approval signature could not be recorded.'],
            ]);
        }

        return [
            'signature_path' => $path,
            'signature_mime' => $mime,
            'signer_name' => $user->full_name,
            'signer_position' => $user->position,
        ];
    }

    /**
     * @return array{signature_path: string, signature_mime: string, signer_name: string, signer_position: ?string}
     */
    public static function copyForRequester(User $user): array
    {
        $user->refresh();
        $source = self::safeRelative((string) $user->signature_path);

        if ($source === null || !Storage::disk(self::USER_DISK)->exists($source)) {
            throw ValidationException::withMessages([
                'signature' => ['Save your e-signature in My Profile before submitting this booking.'],
            ]);
        }

        $mime = $user->signature_mime === 'image/png' ? 'image/png' : 'image/jpeg';
        $extension = $mime === 'image/png' ? 'png' : 'jpg';
        $path = 'requesters/'.Str::uuid()->toString().'.'.$extension;
        $bytes = Storage::disk(self::USER_DISK)->get($source);

        if (!is_string($bytes) || $bytes === '' || !Storage::disk(self::APPROVAL_DISK)->put($path, $bytes)) {
            throw ValidationException::withMessages([
                'signature' => ['The booking signature could not be recorded.'],
            ]);
        }

        return [
            'signature_path' => $path,
            'signature_mime' => $mime,
            'signer_name' => $user->full_name,
            'signer_position' => $user->position,
        ];
    }

    public static function fileDataUri(string $disk, ?string $path, ?string $mime): ?string
    {
        $safe = self::safeRelative((string) $path);

        if ($safe === null || !Storage::disk($disk)->exists($safe)) {
            return null;
        }

        $bytes = Storage::disk($disk)->get($safe);

        if (!is_string($bytes) || $bytes === '') {
            return null;
        }

        $type = $mime === 'image/png' ? 'image/png' : 'image/jpeg';

        return 'data:'.$type.';base64,'.base64_encode($bytes);
    }

    public static function deleteApprovalFile(?string $path): void
    {
        self::delete(self::APPROVAL_DISK, $path);
    }

    public static function userResponse(User $user): StreamedResponse
    {
        return self::response(self::USER_DISK, $user->signature_path, $user->signature_mime);
    }

    public static function storedResponse(?string $path, ?string $mime): StreamedResponse
    {
        return self::response(self::APPROVAL_DISK, $path, $mime);
    }

    public static function approvalResponse(EventBookingApproval $approval): StreamedResponse
    {
        return self::response(
            self::APPROVAL_DISK,
            $approval->signature_path,
            $approval->signature_mime,
        );
    }

    public static function approvalDataUri(EventBookingApproval $approval): ?string
    {
        $path = self::safeRelative((string) $approval->signature_path);

        if ($path === null || !Storage::disk(self::APPROVAL_DISK)->exists($path)) {
            return null;
        }

        $bytes = Storage::disk(self::APPROVAL_DISK)->get($path);

        if (!is_string($bytes) || $bytes === '') {
            return null;
        }

        $mime = $approval->signature_mime === 'image/png' ? 'image/png' : 'image/jpeg';

        return 'data:'.$mime.';base64,'.base64_encode($bytes);
    }

    public static function assertImage(UploadedFile $file): string
    {
        $info = @getimagesize($file->getRealPath() ?: '');
        $type = is_array($info) ? ($info[2] ?? null) : null;

        if (!in_array($type, [IMAGETYPE_PNG, IMAGETYPE_JPEG], true)) {
            throw ValidationException::withMessages([
                'signature' => ['The signature must be a PNG or JPEG image.'],
            ]);
        }

        $width = (int) ($info[0] ?? 0);
        $height = (int) ($info[1] ?? 0);

        if ($width < 1 || $height < 1 || ($width * $height) > 16_000_000) {
            throw ValidationException::withMessages([
                'signature' => ['The signature image dimensions are not allowed.'],
            ]);
        }

        return $type === IMAGETYPE_PNG ? 'image/png' : 'image/jpeg';
    }

    private static function response(string $disk, ?string $path, ?string $mime): StreamedResponse
    {
        $safe = self::safeRelative((string) $path);

        if ($safe === null || !Storage::disk($disk)->exists($safe)) {
            abort(404);
        }

        $type = $mime === 'image/png' ? 'image/png' : 'image/jpeg';

        return Storage::disk($disk)->response($safe, 'signature.'.($type === 'image/png' ? 'png' : 'jpg'), [
            'Content-Type' => $type,
            'Content-Disposition' => 'inline; filename="signature.'.($type === 'image/png' ? 'png' : 'jpg').'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private static function delete(string $disk, ?string $path): void
    {
        $safe = self::safeRelative((string) $path);

        if ($safe !== null && Storage::disk($disk)->exists($safe)) {
            Storage::disk($disk)->delete($safe);
        }
    }

    private static function safeRelative(string $path): ?string
    {
        $normalized = str_replace('\\', '/', trim($path));

        if ($normalized === ''
            || str_contains($normalized, '..')
            || str_starts_with($normalized, '/')
            || str_contains($normalized, "\0")) {
            return null;
        }

        return $normalized;
    }
}
