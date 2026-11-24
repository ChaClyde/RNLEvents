<?php

namespace App\Models;

use App\Permissions\ApprovalStage;
use App\Scheduling\TimeFormat;
use App\Signatures\SignatureStorage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
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
        'schedule_type',
        'weekdays',
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
        'requester_signature_path',
        'requester_signature_mime',
        'requester_signer_name',
        'requester_signer_position',
        'status',
        'approval_stage',
        'approval_remarks',
        'cancellation_reason',
        'university_wide_activity',
        'university_wide_designated_by',
        'university_wide_designated_at',
        'reservation_span',
        'gym_responsibilities_acknowledged',
        'gym_responsibilities_acknowledged_at',
        'gym_responsibilities_acknowledged_by',
        'gym_responsibility_statement',
        'is_deleted',
    ];

    protected $casts = [
        'date_start' => 'date:Y-m-d',
        'date_end' => 'date:Y-m-d',

        'weekdays' => 'array',

        'number_of_days' => 'integer',
        'expected_attendees' => 'integer',
        'requested_by_user_id' => 'integer',

        'university_wide_activity' => 'boolean',
        'university_wide_designated_at' => 'datetime',
        'gym_responsibilities_acknowledged' => 'boolean',
        'gym_responsibilities_acknowledged_at' => 'datetime',
        'is_deleted' => 'boolean',
    ];

    protected $hidden = [
        'requester_signature_path',
    ];

    protected $appends = ['time_start_label', 'time_end_label', 'has_requester_signature'];

    protected static function booted(): void
    {
        static::deleting(function (EventBooking $booking) {
            SignatureStorage::deleteApprovalFile($booking->requester_signature_path);

            foreach ($booking->attachments()->get() as $attachment) {
                $path = str_replace('\\', '/', (string) $attachment->stored_path);

                if ($path !== '' && !str_contains($path, '..')) {
                    Storage::disk('event_booking_attachments')->delete($path);
                }
            }
        });
    }

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

    public function universityWideDesignator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'university_wide_designated_by', 'user_id');
    }

    public function resources(): HasMany
    {
        return $this->hasMany(
            EventBookingResource::class,
            'event_booking_id',
            'event_booking_id'
        );
    }

    public function feeSnapshot(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(
            EventBookingFeeSnapshot::class,
            'event_booking_id',
            'event_booking_id'
        );
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(
            EventBookingSchedule::class,
            'event_booking_id',
            'event_booking_id'
        )->orderBy('schedule_date');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(
            EventBookingAttachment::class,
            'event_booking_id',
            'event_booking_id'
        )->orderBy('attachment_id');
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

    /** The booking's dates as plain arrays (used by the conflict checker). */
    public function occurrences(): array
    {
        return $this->schedules()->get()->map(fn ($s) => [
            'date' => $s->schedule_date->toDateString(),
            'time_start' => TimeFormat::hm($s->time_start),
            'time_end' => TimeFormat::hm($s->time_end),
        ])->all();
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */

    public function getHasRequesterSignatureAttribute(): bool
    {
        return is_string($this->requester_signature_path) && $this->requester_signature_path !== '';
    }

    public function getTimeStartLabelAttribute(): ?string
    {
        return TimeFormat::label($this->time_start);
    }

    public function getTimeEndLabelAttribute(): ?string
    {
        return TimeFormat::label($this->time_end);
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
