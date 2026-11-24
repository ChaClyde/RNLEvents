<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventBookingFeeSnapshot extends Model
{
    protected $table = 'tbl_event_booking_fee_snapshots';

    protected $primaryKey = 'event_booking_fee_snapshot_id';

    protected $fillable = [
        'event_booking_id',
        'venue_rate_id',
        'pricing_basis',
        'venue_amount',
        'overtime_amount',
        'additional_amount',
        'total_amount',
        'calculation_note',
        'rate_snapshot',
        'calculated_at',
        'calculation_confirmed_at',
        'calculation_confirmed_by',
    ];

    protected $casts = [
        'venue_amount' => 'decimal:2',
        'overtime_amount' => 'decimal:2',
        'additional_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'rate_snapshot' => 'array',
        'calculated_at' => 'datetime',
        'calculation_confirmed_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(EventBooking::class, 'event_booking_id', 'event_booking_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(
            EventBookingFeeLine::class,
            'event_booking_fee_snapshot_id',
            'event_booking_fee_snapshot_id'
        )->orderBy('sort_order');
    }

    public function rateVersions(): HasMany
    {
        return $this->hasMany(
            EventBookingFeeRate::class,
            'event_booking_fee_snapshot_id',
            'event_booking_fee_snapshot_id'
        );
    }
}
