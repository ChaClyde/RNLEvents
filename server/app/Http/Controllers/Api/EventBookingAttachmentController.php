<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\EventBooking;
use App\Models\EventBookingAttachment;
use App\Models\User;
use App\Permissions\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EventBookingAttachmentController extends Controller
{
    use ScopesQueriesByPermission;

    private const DISK = 'event_booking_attachments';

    private const MAX_KILOBYTES = 5120;

    public function index(Request $request, int $event_booking_id)
    {
        $booking = $this->visibleBooking($request->user(), $event_booking_id);

        return response()->json([
            'message' => 'Event booking attachments loaded successfully.',
            'data' => $booking->attachments()->orderBy('attachment_id')->get(),
        ]);
    }

    public function store(Request $request, int $event_booking_id)
    {
        $booking = $this->editableBooking($request->user(), $event_booking_id);

        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'max:'.self::MAX_KILOBYTES,
                'mimes:pdf,jpg,jpeg,png',
            ],
            'attachment_type' => ['nullable', 'in:'.EventBookingAttachment::TYPE_LETTER],
        ]);

        $upload = $validated['file'];
        $extension = strtolower($upload->getClientOriginalExtension() ?: $upload->extension());
        $storedName = Str::uuid()->toString().'.'.$extension;
        $directory = (string) $booking->event_booking_id;

        $storedPath = $upload->storeAs($directory, $storedName, self::DISK);

        if ($storedPath === false) {
            abort(500, 'The attachment could not be stored.');
        }

        $existing = $booking->attachments()
            ->where('attachment_type', EventBookingAttachment::TYPE_LETTER)
            ->first();

        if ($existing) {
            $this->deleteStoredFile($existing->stored_path);
            $existing->delete();
        }

        $attachment = EventBookingAttachment::create([
            'event_booking_id' => $booking->event_booking_id,
            'uploaded_by' => $request->user()->user_id,
            'original_filename' => $this->safeOriginalName($upload->getClientOriginalName()),
            'stored_path' => $storedPath,
            'mime_type' => $upload->getMimeType() ?: 'application/octet-stream',
            'file_size' => $upload->getSize(),
            'attachment_type' => EventBookingAttachment::TYPE_LETTER,
        ]);

        return response()->json([
            'message' => 'Letter of request uploaded successfully.',
            'data' => $attachment,
        ], 201);
    }

    public function preview(Request $request, int $event_booking_id, int $attachment_id)
    {
        $attachment = $this->visibleAttachment($request->user(), $event_booking_id, $attachment_id);

        return $this->fileResponse($attachment, 'inline');
    }

    public function download(Request $request, int $event_booking_id, int $attachment_id)
    {
        $attachment = $this->visibleAttachment($request->user(), $event_booking_id, $attachment_id);

        return $this->fileResponse($attachment, 'attachment');
    }

    public function destroy(Request $request, int $event_booking_id, int $attachment_id)
    {
        $booking = $this->editableBooking($request->user(), $event_booking_id);
        $attachment = $booking->attachments()->whereKey($attachment_id)->firstOrFail();

        $this->deleteStoredFile($attachment->stored_path);
        $attachment->delete();

        return response()->json([
            'message' => 'Attachment removed successfully.',
        ]);
    }

    private function visibleBooking(User $user, int $eventBookingId): EventBooking
    {
        $query = EventBooking::query()
            ->where('is_deleted', false)
            ->whereKey($eventBookingId);

        $query = $this->constrainByPermission(
            $query,
            $user,
            Permission::EVENT_BOOKINGS_VIEW,
            Permission::EVENT_APPROVALS_VIEW,
        );

        return $query->firstOrFail();
    }

    private function editableBooking(User $user, int $eventBookingId): EventBooking
    {
        $booking = $this->visibleBooking($user, $eventBookingId);

        abort_unless(
            $user->allows(Permission::EVENT_BOOKINGS_EDIT, ['resource' => $booking])
                || $user->allows(Permission::EVENT_BOOKINGS_CREATE, ['resource' => $booking]),
            403,
            'This action is unauthorized.'
        );

        abort_unless(
            (int) $booking->requested_by_user_id === (int) $user->user_id,
            403,
            'This action is unauthorized.'
        );

        abort_unless(
            $booking->isRequesterEditable(),
            403,
            'Submitted attachments cannot be changed after review has started.'
        );

        return $booking;
    }

    private function visibleAttachment(User $user, int $eventBookingId, int $attachmentId): EventBookingAttachment
    {
        $booking = $this->visibleBooking($user, $eventBookingId);

        return $booking->attachments()->whereKey($attachmentId)->firstOrFail();
    }

    private function fileResponse(EventBookingAttachment $attachment, string $disposition): StreamedResponse
    {
        $path = $this->safeStoredPath($attachment->stored_path);
        $filename = $this->safeOriginalName($attachment->original_filename);

        return Storage::disk(self::DISK)->response($path, $filename, [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function safeStoredPath(string $path): string
    {
        $normalized = str_replace('\\', '/', $path);

        abort_if(
            $normalized === ''
                || str_contains($normalized, '..')
                || str_starts_with($normalized, '/')
                || !Storage::disk(self::DISK)->exists($normalized),
            404
        );

        return $normalized;
    }

    private function safeOriginalName(string $name): string
    {
        $base = basename(str_replace('\\', '/', $name));
        $clean = preg_replace('/[^A-Za-z0-9._ -]/', '', $base) ?: 'letter';

        return substr($clean, 0, 180);
    }

    private function deleteStoredFile(string $path): void
    {
        $normalized = str_replace('\\', '/', $path);

        if ($normalized !== '' && !str_contains($normalized, '..') && Storage::disk(self::DISK)->exists($normalized)) {
            Storage::disk(self::DISK)->delete($normalized);
        }
    }
}
