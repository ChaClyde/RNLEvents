<?php

namespace App\Models;

use App\Permissions\ApprovalStage;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleBooking extends Model
{
    protected $table = 'tbl_vehicle_bookings';

    protected $primaryKey = 'vehicle_booking_id';

    protected $fillable = [
        'requested_by_user_id',
        'office_id',
        'requested_by',
        'email',
        'tel_number',
        'destination',
        'purpose',
        'remarks',
        'travel_date',
        'departure_time',
        'expected_return_date',
        'expected_return_time',
        'passenger_count',
        'passenger_details',
        'vehicle_id',
        'driver_id',
        'status',
        'approval_stage',
        'approval_remarks',
        'cancellation_reason',
        'is_deleted',
    ];

    protected $casts = [
        'travel_date' => 'date:Y-m-d',
        'expected_return_date' => 'date:Y-m-d',
        'passenger_count' => 'integer',
        'requested_by_user_id' => 'integer',
        'office_id' => 'integer',
        'vehicle_id' => 'integer',
        'driver_id' => 'integer',
        'is_deleted' => 'boolean',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id', 'user_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id', 'office_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'vehicle_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id', 'driver_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(
            VehicleBookingApproval::class,
            'vehicle_booking_id',
            'vehicle_booking_id'
        )->orderBy('vehicle_booking_approval_id');
    }

    public function isRequesterEditable(): bool
    {
        return $this->status === 'pending'
            && $this->approval_stage === ApprovalStage::OFFICE_HEAD
            && !$this->approvals()->exists();
    }

    public function hasAssignment(): bool
    {
        return $this->vehicle_id !== null && $this->driver_id !== null;
    }

    public function tripStartsAt(): Carbon
    {
        return Carbon::parse(
            $this->travel_date->toDateString() . ' ' . $this->timeValue($this->departure_time)
        );
    }

    public function tripEndsAt(): Carbon
    {
        return Carbon::parse(
            $this->expected_return_date->toDateString() . ' ' . $this->timeValue($this->expected_return_time)
        );
    }

    public function overlapsTrip(Carbon $start, Carbon $end): bool
    {
        return $this->tripStartsAt()->lt($end) && $this->tripEndsAt()->gt($start);
    }

    public function scopeActive($query)
    {
        return $query->where('is_deleted', false);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeScheduleBlocking($query)
    {
        return $query
            ->where('is_deleted', false)
            ->whereIn('status', ['pending', 'approved']);
    }

    private function timeValue(mixed $time): string
    {
        if (is_string($time)) {
            return strlen($time) === 5 ? $time . ':00' : $time;
        }

        return (string) $time;
    }
}
