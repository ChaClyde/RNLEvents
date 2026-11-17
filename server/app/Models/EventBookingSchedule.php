<?php

namespace App\Models;

use App\Scheduling\TimeFormat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventBookingSchedule extends Model
{
    protected $table = 'tbl_event_booking_schedules';

    protected $primaryKey = 'event_booking_schedule_id';

    protected $fillable = [
        'event_booking_id',
        'venue_id',
        'schedule_date',
        'time_start',
        'time_end',
    ];

    protected $casts = [
        'schedule_date' => 'date:Y-m-d',
    ];

    protected $appends = ['time_start_label', 'time_end_label'];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(EventBooking::class, 'event_booking_id', 'event_booking_id');
    }

    public function getTimeStartLabelAttribute(): ?string
    {
        return TimeFormat::label($this->time_start);
    }

    public function getTimeEndLabelAttribute(): ?string
    {
        return TimeFormat::label($this->time_end);
    }
}
