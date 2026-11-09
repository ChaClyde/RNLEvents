<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    protected $table = 'tbl_vehicles';

    protected $primaryKey = 'vehicle_id';

    protected $fillable = [
        // Basic Information
        'vehicle_name',
        'plate_number',
        'vehicle_type',
        'description',

        // Seating
        'capacity',
        'seating_notes',

        // Person in Charge
        'person_in_charge',
        'pic_contact_number',
        'pic_email',

        // Availability
        'status',

        // Image
        'image_path',
        'is_deleted',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'is_deleted' => 'boolean',
    ];

    protected $appends = ['image_url'];

    /*
    |--------------------------------------------------------------------------
    | Image URL (used by the vehicle picker and the vehicle pages)
    |--------------------------------------------------------------------------
    */

    public function bookings(): HasMany
    {
        return $this->hasMany(VehicleBooking::class, 'vehicle_id', 'vehicle_id');
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? url("/api/vehicles/getVehicleImage/{$this->vehicle_id}")
                . '?v=' . $this->updated_at?->timestamp
            : null;
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeActive($query)
    {
        return $query->where('is_deleted', false);
    }
}
