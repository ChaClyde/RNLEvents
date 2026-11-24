<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\VehicleBooking;
use App\Permissions\Permission;
use App\VehicleBookings\VehicleBookingSlip;
use Illuminate\Http\Request;

class VehicleBookingSlipController extends Controller
{
    use ScopesQueriesByPermission;

    public function preview(Request $request, int $vehicle_booking_id)
    {
        return VehicleBookingSlip::response($this->booking($request, $vehicle_booking_id), 'inline');
    }

    public function download(Request $request, int $vehicle_booking_id)
    {
        return VehicleBookingSlip::response($this->booking($request, $vehicle_booking_id), 'attachment');
    }

    private function booking(Request $request, int $id): VehicleBooking
    {
        return $this->constrainByPermission(
            VehicleBooking::query()->where('is_deleted', false)->whereKey($id),
            $request->user(),
            Permission::VEHICLE_BOOKINGS_VIEW,
            Permission::VEHICLE_APPROVALS_VIEW,
        )->firstOrFail();
    }
}
