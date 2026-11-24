<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
        'license_expiry',

        // Availability
        'driver_status',
        'status_remarks',
        'status_start_date',
        'status_end_date',

        'is_deleted',
    ];

    protected function casts(): array
    {
        return [
            'license_expiry' => 'date:Y-m-d',
            'status_start_date' => 'date:Y-m-d',
            'status_end_date' => 'date:Y-m-d',
            'is_deleted' => 'boolean',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function bookings(): HasMany
    {
        return $this->hasMany(VehicleBooking::class, 'driver_id', 'driver_id');
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
     * not on leave/unavailable that day.
     * This does not look at trips; the booking conflict check does that.
     */
    public function scopeAvailableOn($query, string $date)
    {
        return $query->availableBetween($date, $date);
    }

    /**
     * Free for every day from $from through $to (Y-m-d).
     * Leave that ends before the range, or starts after it, does not block the trip.
     */
    public function scopeAvailableBetween($query, string $from, string $to)
    {
        return $query->where(function ($q) use ($from, $to) {
            $q->where('driver_status', 'Available')
                ->orWhereDate('status_start_date', '>', $to)
                ->orWhereDate('status_end_date', '<', $from);
        });
    }
}