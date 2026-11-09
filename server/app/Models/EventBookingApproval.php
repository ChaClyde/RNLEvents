<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventBookingApproval extends Model
{
    public const ACTION_APPROVED = 'approved';
    public const ACTION_REJECTED = 'rejected';

    protected $table = 'tbl_event_booking_approvals';

    protected $primaryKey = 'event_booking_approval_id';

    protected $fillable = [
        'event_booking_id',
        'approver_user_id',
        'approval_stage',
        'action',
        'remarks',
    ];

    protected $casts = [
        'event_booking_id' => 'integer',
        'approver_user_id' => 'integer',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(
            EventBooking::class,
            'event_booking_id',
            'event_booking_id'
        );
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_user_id', 'user_id');
    }
}
