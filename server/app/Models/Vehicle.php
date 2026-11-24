<?php

namespace App\Models;

use Carbon\Carbon;
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
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function bookings(): HasMany
    {
        return $this->hasMany(VehicleBooking::class, 'vehicle_id', 'vehicle_id');
    }

    public function maintenance(): HasMany
    {
        return $this->hasMany(VehicleMaintenance::class, 'vehicle_id', 'vehicle_id');
    }

    // Scheduled maintenance that has not finished yet (running now or coming up)
    public function upcomingMaintenance(): HasMany
    {
        return $this->maintenance()
            ->where('status', 'scheduled')
            ->whereDate('date_end', '>=', Carbon::today()->toDateString())
            ->orderBy('date_start');
    }

    /*
    |--------------------------------------------------------------------------
    | Image URL (used by the vehicle picker and the vehicle pages)
    |--------------------------------------------------------------------------
    */

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? url("/api/vehicles/getVehicleImage/{$this->vehicle_id}")
                . '?v=' . $this->updated_at?->timestamp
            : null;
    }

    /*
    |--------------------------------------------------------------------------
    | Availability (computed from status + the maintenance sheet)
    |--------------------------------------------------------------------------
    |
    | These are not appended to every JSON response. Call
    | $vehicle->append([...]) where they are needed (see VehicleController).
    |
    */

    // Maintenance happening today
    public function getCurrentMaintenanceAttribute(): ?VehicleMaintenance
    {
        $today = Carbon::today()->toDateString();

        return $this->upcomingMaintenance->first(
            fn (VehicleMaintenance $item) => $item->date_start->toDateString() <= $today
        );
    }

    // The next maintenance that has not started yet
    public function getNextMaintenanceAttribute(): ?VehicleMaintenance
    {
        $today = Carbon::today()->toDateString();

        return $this->upcomingMaintenance->first(
            fn (VehicleMaintenance $item) => $item->date_start->toDateString() > $today
        );
    }

    // available | unavailable | maintenance
    public function getAvailabilityStatusAttribute(): string
    {
        if ($this->status === 'unavailable') {
            return 'unavailable';
        }

        if ($this->status === 'maintenance' || $this->current_maintenance) {
            return 'maintenance';
        }

        return 'available';
    }

    // Text the frontend can show as-is, or null when there is nothing to say
    public function getAvailabilityMessageAttribute(): ?string
    {
        if ($this->status === 'unavailable') {
            return 'This vehicle is currently unavailable.';
        }

        if ($this->status === 'maintenance' && !$this->current_maintenance) {
            return 'This vehicle is under maintenance.';
        }

        $current = $this->current_maintenance;

        if ($current) {
            $until = $current->date_end->format('M j, Y');

            return "Under scheduled maintenance ({$current->reason}) until {$until}.";
        }

        $next = $this->next_maintenance;

        if ($next) {
            return "Maintenance is scheduled {$next->range_label}. "
                . 'The vehicle cannot be booked on those dates.';
        }

        return null;
    }

    // The scheduled maintenance that overlaps a date range, if any.
    // Use this when validating a booking.
    public function maintenanceBetween(string $from, string $to): ?VehicleMaintenance
    {
        return $this->maintenance()
            ->where('status', 'scheduled')
            ->whereDate('date_start', '<=', $to)
            ->whereDate('date_end', '>=', $from)
            ->orderBy('date_start')
            ->first();
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

    // Vehicles out of service on a date because of scheduled maintenance
    public function scopeInMaintenanceOn($query, string $date)
    {
        return $query->whereHas('maintenance', function ($q) use ($date) {
            $q->where('status', 'scheduled')
                ->whereDate('date_start', '<=', $date)
                ->whereDate('date_end', '>=', $date);
        });
    }

    // Vehicles that can be booked for a date range: switched on and with
    // no scheduled maintenance overlapping it (trips are not looked at here)
    public function scopeAvailableBetween($query, string $from, string $to)
    {
        return $query->where('status', 'available')
            ->whereDoesntHave('maintenance', function ($q) use ($from, $to) {
                $q->where('status', 'scheduled')
                    ->whereDate('date_start', '<=', $to)
                    ->whereDate('date_end', '>=', $from);
            });
    }

    /*
    |--------------------------------------------------------------------------
    | Fleet buckets for dashboards and reports
    |--------------------------------------------------------------------------
    |
    | These three add up to all active vehicles:
    | - unavailable: switched off manually (status = 'unavailable')
    | - under maintenance: switched on, but maintenance covers today
    | - available: switched on, with no maintenance today
    |
    */

    public function scopeUnderMaintenanceToday($query)
    {
        return $query->where('status', 'available')
            ->inMaintenanceOn(Carbon::today()->toDateString());
    }

    public function scopeAvailableToday($query)
    {
        $today = Carbon::today()->toDateString();

        return $query->where('status', 'available')
            ->whereDoesntHave('maintenance', function ($q) use ($today) {
                $q->where('status', 'scheduled')
                    ->whereDate('date_start', '<=', $today)
                    ->whereDate('date_end', '>=', $today);
            });
    }
}