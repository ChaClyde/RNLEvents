<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Announcement extends Model
{
    protected $table = 'tbl_announcements';

    protected $primaryKey = 'announcement_id';

    protected $fillable = [
        'created_by',
        'title',
        'body',
        'is_deleted',
    ];

    protected $casts = [
        'created_by' => 'integer',
        'is_deleted' => 'boolean',
    ];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }
}
