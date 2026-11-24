<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\EventBooking;
use App\Models\User;
use App\Permissions\Permission;
use App\Signatures\SignatureStorage;
use Illuminate\Http\Request;

class EventBookingApprovalSignatureController extends Controller
{
    use ScopesQueriesByPermission;

    public function show(Request $request, int $event_booking_id, int $approval_id)
    {
        $booking = $this->visibleBooking($request->user(), $event_booking_id);
        $approval = $booking->approvals()->whereKey($approval_id)->firstOrFail();

        return SignatureStorage::approvalResponse($approval);
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
