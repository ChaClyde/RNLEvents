<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventBookingAttachment extends Model
{
    public const TYPE_LETTER = 'letter_of_request';

    protected $table = 'tbl_event_booking_attachments';

    protected $primaryKey = 'attachment_id';

    protected $fillable = [
        'event_booking_id',
        'uploaded_by',
        'original_filename',
        'stored_path',
        'mime_type',
        'file_size',
        'attachment_type',
    ];

    protected $hidden = [
        'stored_path',
    ];

    protected $casts = [
        'event_booking_id' => 'integer',
        'uploaded_by' => 'integer',
        'file_size' => 'integer',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(EventBooking::class, 'event_booking_id', 'event_booking_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by', 'user_id');
    }
}
