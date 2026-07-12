<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Office extends Model
{
    use HasFactory, Notifiable;

    protected $table = 'tbl_offices';
    protected $primaryKey = 'office_id';

    protected $fillable = [
        'office',
        'description',
        'is_deleted',
    ];

    protected $casts = [
        'is_deleted' => 'boolean',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'office_id', 'office_id');
    }
}
