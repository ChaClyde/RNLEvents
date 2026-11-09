<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventBookingResource extends Model
{
    protected $table = 'tbl_event_booking_resources';

    protected $primaryKey = 'event_booking_resource_id';

    protected $fillable = [
        'event_booking_id',
        'resource_id',
        'resource_name',
        'quantity',
        'notes',
    ];

    protected $casts = [
        'event_booking_id' => 'integer',
        'resource_id' => 'integer',
        'quantity' => 'integer',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(
            EventBooking::class,
            'event_booking_id',
            'event_booking_id'
        );
    }

    public function resource(): BelongsTo
    {
        return $this->belongsTo(
            VenueResource::class,
            'resource_id',
            'resource_id'
        );
    }
}
