<?php

namespace App\Http\Controllers\Api;

use App\EventBookings\EventBookingSlip;
use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\EventBooking;
use App\Models\User;
use App\Permissions\Permission;
use App\Signatures\SignatureStorage;
use Illuminate\Http\Request;

class EventBookingSlipController extends Controller
{
    use ScopesQueriesByPermission;

    public function preview(Request $request, int $event_booking_id)
    {
        return EventBookingSlip::response(
            $this->visibleBooking($request->user(), $event_booking_id),
            'inline',
        );
    }

    public function requesterSignature(Request $request, int $event_booking_id)
    {
        $booking = $this->visibleBooking($request->user(), $event_booking_id);

        return SignatureStorage::storedResponse(
            $booking->requester_signature_path,
            $booking->requester_signature_mime,
        );
    }

    public function download(Request $request, int $event_booking_id)
    {
        return EventBookingSlip::response(
            $this->visibleBooking($request->user(), $event_booking_id),
            'attachment',
        );
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
}
