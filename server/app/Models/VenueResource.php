<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueResource extends Model
{
    protected $table = 'tbl_venue_resources';

    protected $primaryKey = 'resource_id';

    protected $fillable = [
        'venue_id',
        'resource_name',
        'total_quantity',
        'availability_type',
        'condition',
        'coordination_office',
        'notes',
    ];

    protected $casts = [
        'venue_id' => 'integer',
        'total_quantity' => 'integer',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function venue(): BelongsTo
    {
        return $this->belongsTo(
            Venue::class,
            'venue_id',
            'venue_id'
        );
    }
}
