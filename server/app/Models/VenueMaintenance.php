<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueMaintenance extends Model
{
    protected $table = 'tbl_venue_maintenance';

    protected $primaryKey = 'maintenance_id';

    protected $fillable = [
        'venue_id',
        'reason',
        'notes',
        'date_start',
        'date_end',
        'status',
    ];

    protected $casts = [
        'venue_id' => 'integer',
        'date_start' => 'date:Y-m-d',
        'date_end' => 'date:Y-m-d',
    ];

    protected $appends = ['phase', 'range_label'];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'venue_id', 'venue_id');
    }

    public function getPhaseAttribute(): string
    {
        if ($this->status !== 'scheduled') {
            return $this->status;
        }

        $today = Carbon::today()->toDateString();

        if ($this->date_end->toDateString() < $today) {
            return 'overdue';
        }

        return $this->date_start->toDateString() <= $today
            ? 'ongoing'
            : 'upcoming';
    }

    public function getRangeLabelAttribute(): string
    {
        $start = $this->date_start->format('M j, Y');
        $end = $this->date_end->format('M j, Y');

        return $start === $end ? "on {$start}" : "from {$start} to {$end}";
    }

    /**
     * Scheduled maintenance that covers any of the given dates.
     *
     * @param  list<string>  $dates
     */
    public static function blocking(int $venueId, array $dates): ?self
    {
        if ($dates === []) {
            return null;
        }

        $start = min($dates);
        $end = max($dates);

        return static::query()
            ->where('venue_id', $venueId)
            ->where('status', 'scheduled')
            ->whereDate('date_start', '<=', $end)
            ->whereDate('date_end', '>=', $start)
            ->orderBy('date_start')
            ->get()
            ->first(function (self $row) use ($dates) {
                $from = $row->date_start->toDateString();
                $to = $row->date_end->toDateString();

                foreach ($dates as $date) {
                    if ($date >= $from && $date <= $to) {
                        return true;
                    }
                }

                return false;
            });
    }

    public function bookingMessage(): string
    {
        return "This venue is under scheduled maintenance ({$this->reason}) {$this->range_label} and cannot be booked.";
    }
}
