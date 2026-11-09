<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venue extends Model
{
    protected $table = 'tbl_venues';

    protected $primaryKey = 'venue_id';

    protected $fillable = [
        // Basic Information
        'venue',
        'description',
        'capacity',
        'location',

        // Person in Charge
        'person_in_charge',
        'pic_contact_number',
        'pic_email',

        // Image
        'venue_image',

        // Facilities
        'facilities',

        // Overtime
        'overtime_rate',
        'overtime_policy',

        // Status
        'status',
        'is_deleted',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'facilities' => 'array',
        'overtime_rate' => 'decimal:2',
        'is_deleted' => 'boolean',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function resources(): HasMany
    {
        return $this->hasMany(
            VenueResource::class,
            'venue_id',
            'venue_id'
        );
    }
}
