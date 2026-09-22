<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Venue extends Model
{
    use HasFactory;

    protected $table = 'tbl_venues';
    protected $primaryKey = 'venue_id';

    protected $fillable = [
        'venue',
        'description',
        'capacity',
        'location',
        'venue_image',
        'is_deleted',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'is_deleted' => 'boolean',
    ];
}
