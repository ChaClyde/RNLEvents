<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleMaintenance extends Model
{
    protected $table = 'tbl_vehicle_maintenance';

    protected $primaryKey = 'maintenance_id';

    protected $fillable = [
        'vehicle_id',
        'reason',
        'notes',
        'date_start',
        'date_end',
        'status',
    ];

    protected $casts = [
        'vehicle_id' => 'integer',
        'date_start' => 'date:Y-m-d',
        'date_end' => 'date:Y-m-d',
    ];

    protected $appends = ['phase', 'range_label'];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'vehicle_id');
    }

    // upcoming | ongoing | overdue | completed | cancelled
    // "overdue" = still scheduled but its end date has passed
    // (probably someone forgot to mark it completed)
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

    // "on Nov 20, 2026" or "from Nov 20, 2026 to Nov 22, 2026"
    public function getRangeLabelAttribute(): string
    {
        $start = $this->date_start->format('M j, Y');
        $end = $this->date_end->format('M j, Y');

        return $start === $end ? "on {$start}" : "from {$start} to {$end}";
    }
}