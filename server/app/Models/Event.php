<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Event extends Model
{
    use HasFactory;

    protected $table = 'tbl_events';
    protected $primaryKey = 'event_id';

    protected $fillable = [
        'event_booking_id',
        'purpose',
        'venue_id',
        'status',
        'approved_at',
        'time_start',
        'time_end',
        'date_start',
        'date_end',
        'number_of_days',
        'chairs',
        'tables',
        'lights_and_sounds',
        'piano',
        'multimedia_projector',
        'hvls_electric_fan',
        'others_specify',
        'others_quantity',
        'requested_by',
        'requested_by_user_id',
        'office_id',
        'email',
        'tel_number',
        'is_deleted',
    ];

    protected $casts = [
        'date_start' => 'date',
        'date_end' => 'date',
        'approved_at' => 'datetime',
        'chairs' => 'integer',
        'others_quantity' => 'integer',
        'number_of_days' => 'integer',
        'lights_and_sounds' => 'boolean',
        'piano' => 'boolean',
        'multimedia_projector' => 'boolean',
        'hvls_electric_fan' => 'boolean',
        'is_deleted' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (Event $event) {
            $start = Carbon::parse($event->date_start);
            $end = Carbon::parse($event->date_end);
            $event->number_of_days = $start->diffInDays($end) + 1;
        });
    }

    public function venue()
    {
        return $this->belongsTo(Venue::class, 'venue_id', 'venue_id');
    }

    public function office()
    {
        return $this->belongsTo(Office::class, 'office_id', 'office_id');
    }

    public function letters(): HasMany
    {
        return $this->hasMany(
            EventBookingAttachment::class,
            'event_booking_id',
            'event_booking_id',
        )->where('attachment_type', EventBookingAttachment::TYPE_LETTER);
    }
}
