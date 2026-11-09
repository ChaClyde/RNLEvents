<?php

namespace App\Models;

use App\Permissions\ApprovalStage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventBooking extends Model
{
    protected $table = 'tbl_event_bookings';

    protected $primaryKey = 'event_booking_id';

    protected $fillable = [
        'venue_id',
        'purpose',
        'description',
        'date_start',
        'date_end',
        'time_start',
        'time_end',
        'number_of_days',
        'expected_attendees',
        'requested_by',
        'requested_by_user_id',
        'office_id',
        'email',
        'tel_number',
        'status',
        'approval_stage',
        'approval_remarks',
        'cancellation_reason',
        'is_deleted',
    ];

    protected $casts = [
        'date_start' => 'date:Y-m-d',
        'date_end' => 'date:Y-m-d',

        'number_of_days' => 'integer',
        'expected_attendees' => 'integer',
        'requested_by_user_id' => 'integer',

        'is_deleted' => 'boolean',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'venue_id', 'venue_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id', 'office_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id', 'user_id');
    }

    public function resources(): HasMany
    {
        return $this->hasMany(
            EventBookingResource::class,
            'event_booking_id',
            'event_booking_id'
        );
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(
            EventBookingApproval::class,
            'event_booking_id',
            'event_booking_id'
        )->orderBy('event_booking_approval_id');
    }

    public function isRequesterEditable(): bool
    {
        return $this->status === 'pending'
            && $this->approval_stage === ApprovalStage::OFFICE_HEAD
            && !$this->approvals()->exists();
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

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}
