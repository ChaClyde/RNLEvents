<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory;

    protected $table = 'tbl_vehicles';
    protected $primaryKey = 'vehicle_id';

    protected $fillable = [
        'vehicle_name',
        'vehicle_type',
        'vehicle_maintenance',
        'capacity',
        'status',
        'image_path',
        'is_deleted',
    ];

    protected $casts = [
        'is_deleted' => 'boolean',
    ];
}
