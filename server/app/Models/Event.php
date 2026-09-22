<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Event extends Model
{
    use HasFactory;

    protected $table = 'tbl_events';
    protected $primaryKey = 'event_id';

    protected $fillable = [
        'purpose',
        'venue_id',
        'time_start',
        'time_end',
        'date_start',
        'date_end',
        'number_of_days',
        'chairs',
        'lights_and_sounds',
        'piano',
        'multimedia_projector',
        'hvls_electric_fan',
        'others_specify',
        'others_quantity',
        'requested_by',
        'office_id',
        'email',
        'tel_number',
        'is_deleted',
    ];

    protected $casts = [
        'date_start' => 'date',
        'date_end' => 'date',
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
}
