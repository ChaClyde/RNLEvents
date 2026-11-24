<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueRateCharge extends Model
{
    protected $table = 'tbl_venue_rate_charges';

    protected $primaryKey = 'venue_rate_charge_id';

    protected $fillable = [
        'venue_rate_id',
        'venue_resource_id',
        'charge_name',
        'charge_type',
        'amount',
        'unit',
        'is_active',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function rate(): BelongsTo
    {
        return $this->belongsTo(VenueRate::class, 'venue_rate_id', 'venue_rate_id');
    }
}
