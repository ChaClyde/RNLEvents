<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventBookingFeeRate extends Model
{
    protected $table = 'tbl_event_booking_fee_rates';

    protected $primaryKey = 'event_booking_fee_rate_id';

    protected $fillable = [
        'event_booking_fee_snapshot_id',
        'venue_rate_id',
    ];
}
