<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleBookingAttachment extends Model
{
    public const TYPE_LETTER = 'letter_of_request';

    protected $table = 'tbl_vehicle_booking_attachments';

    protected $primaryKey = 'attachment_id';

    protected $fillable = [
        'vehicle_booking_id',
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

    public function booking(): BelongsTo
    {
        return $this->belongsTo(VehicleBooking::class, 'vehicle_booking_id', 'vehicle_booking_id');
    }
}
