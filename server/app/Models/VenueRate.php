<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VenueRate extends Model
{
    protected $table = 'tbl_venue_rates';

    protected $primaryKey = 'venue_rate_id';

    protected $fillable = [
        'venue_id',
        'pricing_basis',
        'hourly_rate',
        'daily_rate',
        'overtime_rate',
        'overtime_policy',
        'included_hours',
        'effective_from',
        'effective_to',
        'is_active',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'hourly_rate' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'overtime_rate' => 'decimal:2',
        'included_hours' => 'decimal:2',
        'effective_from' => 'date:Y-m-d',
        'effective_to' => 'date:Y-m-d',
        'is_active' => 'boolean',
    ];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'venue_id', 'venue_id');
    }

    public function charges(): HasMany
    {
        return $this->hasMany(VenueRateCharge::class, 'venue_rate_id', 'venue_rate_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }
}
