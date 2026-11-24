<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventBookingFeeLine extends Model
{
    protected $table = 'tbl_event_booking_fee_lines';

    protected $primaryKey = 'event_booking_fee_line_id';

    protected $fillable = [
        'event_booking_fee_snapshot_id',
        'schedule_date',
        'line_type',
        'label',
        'quantity',
        'unit',
        'unit_amount',
        'line_amount',
        'sort_order',
    ];

    protected $casts = [
        'schedule_date' => 'date:Y-m-d',
        'quantity' => 'decimal:2',
        'unit_amount' => 'decimal:2',
        'line_amount' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(
            EventBookingFeeSnapshot::class,
            'event_booking_fee_snapshot_id',
            'event_booking_fee_snapshot_id'
        );
    }
}
