<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VehicleBooking;
use App\Models\VehicleBookingAttachment;
use App\Permissions\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VehicleBookingAttachmentController extends Controller
{
    use ScopesQueriesByPermission;

    private const DISK = 'vehicle_booking_attachments';

    public function store(Request $request, int $vehicle_booking_id)
    {
        $booking = $this->editableBooking($request->user(), $vehicle_booking_id);
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:5120', 'mimes:pdf,jpg,jpeg,png'],
        ]);

        $upload = $validated['file'];
        $extension = strtolower($upload->getClientOriginalExtension() ?: $upload->extension());
        $storedPath = $upload->storeAs(
            (string) $booking->vehicle_booking_id,
            Str::uuid()->toString().'.'.$extension,
            self::DISK,
        );

        abort_if($storedPath === false, 500, 'The attachment could not be stored.');

        $existing = $booking->attachments()
            ->where('attachment_type', VehicleBookingAttachment::TYPE_LETTER)
            ->first();

        if ($existing) {
            Storage::disk(self::DISK)->delete($existing->stored_path);
            $existing->delete();
        }

        $attachment = VehicleBookingAttachment::create([
            'vehicle_booking_id' => $booking->vehicle_booking_id,
            'uploaded_by' => $request->user()->user_id,
            'original_filename' => substr(preg_replace('/[^A-Za-z0-9._ -]/', '', basename($upload->getClientOriginalName())) ?: 'letter', 0, 180),
            'stored_path' => $storedPath,
            'mime_type' => $upload->getMimeType() ?: 'application/octet-stream',
            'file_size' => $upload->getSize(),
            'attachment_type' => VehicleBookingAttachment::TYPE_LETTER,
        ]);

        return response()->json([
            'message' => 'Letter of request uploaded successfully.',
            'data' => $attachment,
        ], 201);
    }

    public function preview(Request $request, int $vehicle_booking_id, int $attachment_id)
    {
        return $this->file($request->user(), $vehicle_booking_id, $attachment_id, 'inline');
    }

    public function download(Request $request, int $vehicle_booking_id, int $attachment_id)
    {
        return $this->file($request->user(), $vehicle_booking_id, $attachment_id, 'attachment');
    }

    private function file(User $user, int $bookingId, int $attachmentId, string $disposition): StreamedResponse
    {
        $booking = $this->visibleBooking($user, $bookingId);
        $attachment = $booking->attachments()->whereKey($attachmentId)->firstOrFail();

        return Storage::disk(self::DISK)->response($attachment->stored_path, $attachment->original_filename, [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => $disposition.'; filename="'.$attachment->original_filename.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function visibleBooking(User $user, int $id): VehicleBooking
    {
        $query = $this->constrainByPermission(
            VehicleBooking::query()->where('is_deleted', false)->whereKey($id),
            $user,
            Permission::VEHICLE_BOOKINGS_VIEW,
            Permission::VEHICLE_APPROVALS_VIEW,
        );

        return $query->firstOrFail();
    }

    private function editableBooking(User $user, int $id): VehicleBooking
    {
        $booking = $this->visibleBooking($user, $id);

        abort_unless(
            (int) $booking->requested_by_user_id === (int) $user->user_id
                && $booking->isRequesterEditable(),
            403,
            'This letter can only be changed before the Unit Head reviews the request.'
        );

        return $booking;
    }
}
