<?php

namespace App\Models;

use App\Signatures\SignatureStorage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventBookingApproval extends Model
{
    public const ACTION_APPROVED = 'approved';
    public const ACTION_REJECTED = 'rejected';

    public const SLOT_BUSINESS_MANAGER = 'business_manager';

    public const SLOT_VP_FINANCE = 'vp_finance';

    protected $table = 'tbl_event_booking_approvals';

    protected $primaryKey = 'event_booking_approval_id';

    protected $fillable = [
        'event_booking_id',
        'approver_user_id',
        'approval_stage',
        'decision_slot',
        'action',
        'remarks',
        'signature_path',
        'signature_mime',
        'signer_name',
        'signer_position',
    ];

    protected $hidden = [
        'signature_path',
    ];

    protected $appends = [
        'has_signature',
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

    public function getHasSignatureAttribute(): bool
    {
        return is_string($this->signature_path) && $this->signature_path !== '';
    }

    protected static function booted(): void
    {
        static::deleting(function (EventBookingApproval $approval) {
            SignatureStorage::deleteApprovalFile($approval->signature_path);
        });
    }
}
