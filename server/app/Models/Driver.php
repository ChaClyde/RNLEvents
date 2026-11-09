<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Driver extends Model
{
    use HasFactory;

    protected $table = 'tbl_drivers';
    protected $primaryKey = 'driver_id';

    protected $fillable = [
        // Profile
        'driver_name',
        'contact_number',
        'email',

        // License
        'license_number',
        'license_expiry',

        // Assignment
        'is_reliever',
        'default_vehicle_id',

        // Availability
        'driver_status',
        'status_remarks',
        'status_start_date',
        'status_end_date',

        'is_deleted',
    ];

    protected $appends = ['is_license_expired'];

    protected function casts(): array
    {
        return [
            'license_expiry' => 'date:Y-m-d',
            'status_start_date' => 'date:Y-m-d',
            'status_end_date' => 'date:Y-m-d',
            'is_reliever' => 'boolean',
            'default_vehicle_id' => 'integer',
            'is_deleted' => 'boolean',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function defaultVehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'default_vehicle_id', 'vehicle_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(VehicleBooking::class, 'driver_id', 'driver_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */

    // A license is valid through its expiry date
    public function getIsLicenseExpiredAttribute(): bool
    {
        return $this->license_expiry !== null
            && $this->license_expiry->lt(today());
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

    public function scopeDeleted($query)
    {
        return $query->where('is_deleted', true);
    }

    /**
     * Drivers who can be assigned on a given date (Y-m-d):
     * not on leave/unavailable that day, and with a valid license.
     * This does not look at trips; the booking conflict check does that.
     */
    public function scopeAvailableOn($query, string $date)
    {
        return $query
            ->where(function ($q) use ($date) {
                $q->where('driver_status', 'Available')
                    ->orWhereDate('status_start_date', '>', $date)
                    ->orWhereDate('status_end_date', '<', $date);
            })
            ->where(function ($q) use ($date) {
                $q->whereNull('license_expiry')
                    ->orWhereDate('license_expiry', '>=', $date);
            });
    }
}
